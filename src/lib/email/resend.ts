import { Resend } from 'resend';

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

// Use Resend's test sender until you verify your own domain
export const EMAIL_FROM = 'Daily Articles <onboarding@resend.dev>';
export const EMAIL_REPLY_TO = undefined;
