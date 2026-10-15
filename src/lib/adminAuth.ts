import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { isCloudflareAccessConfigured, verifyCloudflareAccessHeaders } from '@/lib/cloudflareAccess';

export const ADMIN_SESSION_COOKIE = 'andrew_admin_session';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type AdminAuthMode = 'cloudflare' | 'password' | 'unconfigured';

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || '';
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('hex');
}

export function isAdminAuthConfigured(): boolean {
  return getAdminAuthMode() !== 'unconfigured';
}

export function getAdminAuthMode(): AdminAuthMode {
  if (isCloudflareAccessConfigured()) return 'cloudflare';
  if (process.env.NODE_ENV !== 'production' && process.env.ADMIN_PASSWORD && sessionSecret()) return 'password';
  return 'unconfigured';
}

export function verifyAdminPassword(password: string): boolean {
  const expectedPassword = process.env.ADMIN_PASSWORD || '';
  return Boolean(expectedPassword) && safeEqual(password, expectedPassword);
}

export function createAdminSession(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE;
  const payload = `${expiresAt}.${randomBytes(18).toString('hex')}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidAdminSession(token: string | undefined): boolean {
  if (!token || !sessionSecret()) return false;

  const [expiresAtString, nonce, signature] = token.split('.');
  if (!expiresAtString || !nonce || !signature) return false;

  const expiresAt = Number(expiresAtString);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;

  return safeEqual(signature, sign(`${expiresAtString}.${nonce}`));
}

export async function isAdminPageAuthenticated(): Promise<boolean> {
  if (isCloudflareAccessConfigured()) {
    return (await verifyCloudflareAccessHeaders(await headers())).authenticated;
  }

  if (process.env.NODE_ENV === 'production') return false;

  const cookieStore = await cookies();
  return isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function isAdminRequestAuthenticated(request: Request): Promise<boolean> {
  if (isCloudflareAccessConfigured()) {
    return (await verifyCloudflareAccessHeaders(request.headers)).authenticated;
  }

  if (process.env.NODE_ENV === 'production') return false;

  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);

  return isValidAdminSession(token);
}
