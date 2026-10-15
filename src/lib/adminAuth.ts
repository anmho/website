import 'server-only';

import { headers } from 'next/headers';
import { isCloudflareAccessConfigured, verifyCloudflareAccessHeaders } from '@/lib/cloudflareAccess';

export type AdminAuthMode = 'cloudflare' | 'unconfigured';

export function isAdminAuthConfigured(): boolean {
  return getAdminAuthMode() !== 'unconfigured';
}

export function getAdminAuthMode(): AdminAuthMode {
  if (isCloudflareAccessConfigured()) return 'cloudflare';
  return 'unconfigured';
}

export async function isAdminPageAuthenticated(): Promise<boolean> {
  return (await verifyCloudflareAccessHeaders(await headers())).authenticated;
}

export async function isAdminRequestAuthenticated(request: Request): Promise<boolean> {
  return (await verifyCloudflareAccessHeaders(request.headers)).authenticated;
}
