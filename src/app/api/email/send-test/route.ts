import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { getResend, EMAIL_FROM, EMAIL_REPLY_TO } from '@/lib/email/resend';
import { getRandomArticleForDate } from '@/lib/articles/random';
import { DailyArticleEmail } from '@/lib/email/templates/DailyArticle';

/**
 * Send a test email manually.
 * Requires Bearer token authentication.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const recipient = body.email || process.env.DAILY_EMAIL_RECIPIENT;

    if (!recipient) {
      return NextResponse.json(
        { error: 'No recipient specified' },
        { status: 400 }
      );
    }

    const article = getRandomArticleForDate();
    const html = await render(DailyArticleEmail({ article }));

    const { data, error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: recipient,
      replyTo: EMAIL_REPLY_TO,
      subject: `[TEST] Daily Read: ${article.title}`,
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
    console.error('Send test email error:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
