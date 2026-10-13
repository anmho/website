import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'website_admin_session';
export const ADMIN_OAUTH_STATE_COOKIE = 'website_admin_oauth_state';
export const ADMIN_OAUTH_RETURN_COOKIE = 'website_admin_oauth_return';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const OAUTH_STATE_TTL_SECONDS = 60 * 10;

export type AdminSession = {
  githubId: string;
  login: string;
  expiresAt: number;
};

export function getSessionTtlSeconds(): number {
  return SESSION_TTL_SECONDS;
}

export function getOAuthStateTtlSeconds(): number {
  return OAUTH_STATE_TTL_SECONDS;
}

export function isAdminOAuthConfigured(): boolean {
  const hasClientCredentials = Boolean(
    process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET
  );
  const hasAllowlist = Boolean(process.env.ADMIN_GITHUB_LOGIN || process.env.ADMIN_GITHUB_ID);
  return hasClientCredentials && hasAllowlist && Boolean(getSessionSecret());
}

export function getSessionSecret(): string | null {
  return process.env.ADMIN_AUTH_SECRET || process.env.AUTH_SESSION_SECRET || null;
}

function encode(value: string): string {
  return Buffer.from(value, 'utf-8').toString('base64url');
}

function decode(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf-8');
  } catch {
    return null;
  }
}

function sign(value: string): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function signaturesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createAdminSession(githubId: string, login: string): string | null {
  const payload = encode(
    JSON.stringify({ githubId, login, expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })
  );
  const signature = sign(payload);
  return signature ? `${payload}.${signature}` : null;
}

export function getAdminSession(value: string | undefined): AdminSession | null {
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expectedSignature = sign(payload);
  if (!expectedSignature || !signaturesMatch(signature, expectedSignature)) return null;

  const decoded = decode(payload);
  if (!decoded) return null;

  try {
    const session = JSON.parse(decoded) as AdminSession;
    if (!session.githubId || !session.login || session.expiresAt <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getAdminSessionFromRequest(req: NextRequest): AdminSession | null {
  return getAdminSession(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export function isAllowedGithubUser(user: { id: number; login: string }): boolean {
  const allowedId = process.env.ADMIN_GITHUB_ID?.trim();
  const allowedLogin = process.env.ADMIN_GITHUB_LOGIN?.trim().toLowerCase();
  const matchesId = Boolean(allowedId && String(user.id) === allowedId);
  const matchesLogin = Boolean(allowedLogin && user.login.toLowerCase() === allowedLogin);
  return matchesId || matchesLogin;
}

export function safeReturnTo(value: string | null | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/editor';
}

export function createOAuthState(): string {
  return randomBytes(32).toString('hex');
}

export function getAuthError(req: NextRequest): string | null {
  if (!isAdminOAuthConfigured()) {
    return 'server misconfigured: GitHub OAuth is required';
  }
  if (!getAdminSessionFromRequest(req)) {
    return 'unauthorized';
  }
  return null;
}
