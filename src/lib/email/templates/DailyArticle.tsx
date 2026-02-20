import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import type { Article } from '@/lib/articles/random';

interface DailyArticleEmailProps {
  article: Article;
}

export function DailyArticleEmail({ article }: DailyArticleEmailProps) {
  const previewText = `Today's read: ${article.title}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-xl">
            {/* Header */}
            <Section className="text-center mb-8">
              <Text className="text-2xl font-bold text-gray-900 m-0 tracking-tight">
                anmho
              </Text>
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider m-0">
                Daily Article
              </Text>
            </Section>

            {/* Card */}
            <Section className="bg-white rounded-xl p-8 border border-gray-200">
              {/* Format badge */}
              <Text className="inline-block text-xs font-semibold text-emerald-600 bg-emerald-50 rounded px-2 py-1 uppercase tracking-wide mb-4">
                {article.format}
              </Text>

              {/* Title */}
              <Heading className="text-xl font-semibold text-gray-900 leading-snug m-0 mb-3">
                {article.title}
              </Heading>

              {/* Description */}
              <Text className="text-base text-gray-600 leading-relaxed m-0 mb-5">
                {article.description}
              </Text>

              {/* Meta */}
              <Text className="text-sm text-gray-500 m-0 mb-4">
                <span className="font-medium text-gray-700">{article.author}</span>
                <span className="mx-2 text-gray-300">·</span>
                <span>{article.category}</span>
              </Text>

              {/* Tags */}
              <Section className="mb-6">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block text-xs text-gray-500 bg-gray-100 rounded-md px-2.5 py-1 mr-1.5 mb-1.5"
                  >
                    {tag}
                  </span>
                ))}
              </Section>

              {/* Buttons */}
              <Section className="text-center">
                <Button
                  href={article.url}
                  className="inline-block bg-gray-900 text-white text-sm font-semibold rounded-lg px-5 py-3 no-underline"
                >
                  Read Article
                </Button>
              </Section>
            </Section>

            <Hr className="border-gray-200 my-8" />

            {/* More Articles */}
            <Section className="text-center mb-6">
              <Button
                href="https://anmho.com/resources"
                className="inline-block bg-white text-gray-600 text-sm font-medium rounded-lg px-5 py-3 border border-gray-200 no-underline"
              >
                View More Articles
              </Button>
            </Section>

            {/* Footer */}
            <Section className="text-center">
              <Text className="text-sm text-gray-500 m-0 mb-2">
                A daily curated article to expand your knowledge.
              </Text>
              <Text className="text-xs text-gray-400 m-0">
                Reply to this email with feedback or suggestions.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default DailyArticleEmail;
