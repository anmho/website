import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import articlesData from '@/assets/static/json/articles.json';
import Link from 'next/link';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface Article {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
}

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

async function getArticle(slug: string): Promise<Article | null> {
  const articles = articlesData as Article[];
  return articles.find((article) => article.slug === slug) || null;
}

async function getArticleContent(slug: string): Promise<string | null> {
  try {
    const contentPath = join(
      process.cwd(),
      'src',
      'assets',
      'content',
      'articles',
      `${slug}.md`
    );
    const content = await readFile(contentPath, 'utf-8');
    return content;
  } catch {
    return null;
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateStaticParams() {
  const articles = articlesData as Article[];
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const article = await getArticle(params.slug);
  const content = await getArticleContent(params.slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="w-full overflow-hidden text-white">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20 max-w-4xl mx-auto">
            {/* Back link */}
            <Link
              href="/articles"
              className="text-gray-500 hover:text-gray-300 text-sm font-mono mb-12 inline-block transition-colors"
            >
              ← Articles
            </Link>

            {/* Article header */}
            <header className="mb-16">
              <AnimatedTitle>
                <h1 className="sm:text-6xl text-4xl font-medium -tracking-wider leading-tight mb-8 text-gray-100">
                  {article.title}
                </h1>
              </AnimatedTitle>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-gray-500 text-sm font-mono">
                <time dateTime={article.date}>{formatDate(article.date)}</time>
                <span className="hidden sm:inline">•</span>
                <span>{article.readTime}</span>
              </div>
            </header>

            {/* Article content */}
            <article className="prose prose-invert prose-lg max-w-none">
              {content ? (
                <div
                  className="article-content text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: content
                      .split('\n')
                      .map((line) => {
                        // Simple markdown-like rendering
                        if (line.startsWith('# ')) {
                          return `<h1 class="text-4xl font-medium mt-16 mb-6 text-gray-100">${line.slice(
                            2
                          )}</h1>`;
                        }
                        if (line.startsWith('## ')) {
                          return `<h2 class="text-3xl font-medium mt-12 mb-5 text-gray-100">${line.slice(
                            3
                          )}</h2>`;
                        }
                        if (line.startsWith('### ')) {
                          return `<h3 class="text-2xl font-medium mt-10 mb-4 text-gray-100">${line.slice(
                            4
                          )}</h3>`;
                        }
                        if (line.trim() === '') {
                          return '<p class="mb-6"></p>';
                        }
                        // Handle links [text](url)
                        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                        let processedLine = line.replace(
                          linkRegex,
                          '<a href="$2" class="text-gray-400 hover:text-gray-200 underline transition-colors">$1</a>'
                        );
                        // Handle inline code `code`
                        processedLine = processedLine.replace(
                          /`([^`]+)`/g,
                          '<code class="bg-gray-900 px-1.5 py-0.5 rounded text-sm font-mono text-gray-200">$1</code>'
                        );
                        return `<p class="mb-6 leading-relaxed">${processedLine}</p>`;
                      })
                      .join(''),
                  }}
                />
              ) : (
                <div className="text-gray-400 leading-relaxed">
                  <p className="mb-6 text-lg">{article.excerpt}</p>
                  <p className="text-sm text-gray-500 italic">
                    Content coming soon. Create a markdown file at{' '}
                    <code className="text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded">
                      src/assets/content/articles/{article.slug}.md
                    </code>
                  </p>
                </div>
              )}
            </article>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
