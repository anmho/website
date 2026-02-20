import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { getResend, EMAIL_FROM, EMAIL_REPLY_TO } from '@/lib/email/resend';
import { getRandomArticleForDate } from '@/lib/articles/random';
import { DailyArticleEmail } from '@/lib/email/templates/DailyArticle';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Vercel Cron handler for sending daily article emails.
 * Scheduled via vercel.json at 0 16 * * * (8 AM Pacific / 4 PM UTC)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipient = process.env.DAILY_EMAIL_RECIPIENT;

  if (!recipient) {
    return NextResponse.json(
      { error: 'DAILY_EMAIL_RECIPIENT not configured' },
      { status: 500 }
    );
  }

  try {
    const article = getRandomArticleForDate();
    const html = await render(DailyArticleEmail({ article }));

    const { data, error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: recipient,
      replyTo: EMAIL_REPLY_TO,
      subject: `Daily Read: ${article.title}`,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      article: article.title,
      recipient,
    });
  } catch (error) {
    console.error('Failed to send daily article email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: String(error) },
      { status: 500 }
    );
  }
}
