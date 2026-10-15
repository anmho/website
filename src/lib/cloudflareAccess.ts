import 'server-only';

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

type CloudflareAccessResult = {
  authenticated: boolean;
  email?: string;
};

function teamDomain(): string {
  const configuredDomain = process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN?.trim().replace(/\/$/, '');
  if (!configuredDomain) return '';
  return configuredDomain.startsWith('http') ? configuredDomain : `https://${configuredDomain}`;
}

function audience(): string {
  return process.env.CLOUDFLARE_ACCESS_AUD?.trim() || '';
}

export function isCloudflareAccessConfigured(): boolean {
  return Boolean(teamDomain() && audience());
}

function allowedEmails(): string[] {
  return (process.env.CLOUDFLARE_ACCESS_ALLOWED_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function claimEmail(payload: JWTPayload): string | undefined {
  return typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined;
}

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getRemoteJwks() {
  if (!remoteJwks) {
    remoteJwks = createRemoteJWKSet(new URL(`${teamDomain()}/cdn-cgi/access/certs`));
  }
  return remoteJwks;
}

export async function verifyCloudflareAccessHeaders(headers: Headers): Promise<CloudflareAccessResult> {
  if (!isCloudflareAccessConfigured()) return { authenticated: false };

  const assertion = headers.get('cf-access-jwt-assertion');
  if (!assertion) return { authenticated: false };

  try {
    const { payload } = await jwtVerify(assertion, getRemoteJwks(), {
      issuer: teamDomain(),
      audience: audience(),
    });
    const email = claimEmail(payload);
    const allowed = allowedEmails();

    if (allowed.length > 0 && (!email || !allowed.includes(email))) {
      return { authenticated: false };
    }

    return { authenticated: true, email };
  } catch {
    return { authenticated: false };
  }
}
