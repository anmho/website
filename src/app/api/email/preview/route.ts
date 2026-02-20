import { NextResponse } from 'next/server';
import { getRandomArticleForDate } from '@/lib/articles/random';
import { DailyArticleEmail } from '@/lib/email/templates/DailyArticle';
import { render } from '@react-email/components';

/**
 * Preview the daily article email template.
 * Only available in development mode.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Preview only available in development' },
      { status: 403 }
    );
  }

  const article = getRandomArticleForDate();
  const html = await render(DailyArticleEmail({ article }));

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
