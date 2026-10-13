import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthError } from '@/lib/controlPlaneAuth';
import { createContent, isContentConflict } from '@/lib/contentDb';
import { isISODate, slugify } from '@/lib/controlPlaneStore';
import { createArticleRequestSchema } from '../../../../../packages/contracts/src/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authError = getAuthError(req);
  if (authError) {
    return NextResponse.json(
      { error: authError },
      { status: authError === 'unauthorized' ? 401 : 500 }
    );
  }

  const json = await req.json();
  const parsed = createArticleRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'invalid body' },
      { status: 400 }
    );
  }

  const title = parsed.data.title.trim();
  const excerpt = parsed.data.excerpt.trim();
  const date = parsed.data.date?.trim() || new Date().toISOString().slice(0, 10);
  const slug = parsed.data.slug?.trim() || slugify(title);
  const readTime = parsed.data.readTime?.trim() || '8 min read';

  if (!isISODate(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });

  try {
    const article = await createContent({
      id: `article:${slug}`,
      contentType: 'article',
      slug,
      title,
      date,
      excerpt,
      body: parsed.data.markdownBody?.trim() || `# ${title}\n`,
      readTime,
      tags: [],
      metadata: {},
    });
    revalidatePath('/articles');
    revalidatePath(`/articles/${slug}`);
    return NextResponse.json({ article: { slug: article.slug, title: article.title, date: article.date, excerpt: article.excerpt, readTime: article.readTime || readTime } }, { status: 201 });
  } catch (error) {
    if (isContentConflict(error)) {
      return NextResponse.json({ error: `article slug already exists: ${slug}` }, { status: 409 });
    }
    console.error('Failed to create article', error);
    return NextResponse.json({ error: 'failed to save article' }, { status: 500 });
  }
}
