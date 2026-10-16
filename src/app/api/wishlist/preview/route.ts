import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { NextResponse } from 'next/server';
import { isAdminRequestAuthenticated } from '@/lib/adminAuth';
import type { WishlistItemDraft } from '@/lib/wishlist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_HTML_BYTES = 2_000_000;

type PreviewBody = { url?: unknown };

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);?/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function cleanText(value: string, maxLength: number): string {
  return decodeHtml(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function attribute(tag: string, name: string): string {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? cleanText(match[1], 1000) : '';
}

function metaValue(html: string, names: string[]): string {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const key = attribute(tag, 'property') || attribute(tag, 'name') || attribute(tag, 'itemprop');
    if (wanted.has(key.toLowerCase())) {
      const content = attribute(tag, 'content');
      if (content) return content;
    }
  }
  return '';
}

function titleValue(html: string): string {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanText(match[1], 160) : '';
}

function isPrivateIp(address: string): boolean {
  if (isIP(address) === 4) {
    const octets = address.split('.').map(Number);
    const [first, second] = octets;
    return first === 0 || first === 10 || first === 127 || (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168) ||
      (first === 100 && second >= 64 && second <= 127) || (first === 198 && (second === 18 || second === 19)) || first >= 224;
  }

  const normalized = address.toLowerCase();
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb');
}

async function assertPublicUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Enter a valid product URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) {
    throw new Error('Only public HTTP or HTTPS product URLs are supported.');
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || isPrivateIp(hostname)) {
    throw new Error('That URL points to a private network.');
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error('That URL does not resolve to a public network.');
  }

  return url;
}

async function readHtml(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_HTML_BYTES) throw new Error('That product page is too large to read.');

  const body = await response.text();
  if (body.length > MAX_HTML_BYTES) throw new Error('That product page is too large to read.');
  return body;
}

function productDraft(url: URL, html: string): WishlistItemDraft {
  const siteName = metaValue(html, ['og:site_name', 'application-name']) || url.hostname.replace(/^www\./, '');
  const name = metaValue(html, ['og:title', 'twitter:title']) || titleValue(html) || url.hostname;
  const reason = metaValue(html, ['og:description', 'twitter:description', 'description']) || `Imported from ${siteName}.`;
  const category = metaValue(html, ['product:category', 'category']);
  const rawPrice = metaValue(html, ['product:price:amount', 'og:price:amount', 'price']);
  const currency = metaValue(html, ['product:price:currency', 'og:price:currency']);
  const price = rawPrice ? `${currency ? `${currency} ` : ''}${rawPrice}` : '';

  return {
    name: cleanText(name, 160),
    maker: cleanText(siteName, 120),
    category: cleanText(category, 80),
    url: url.toString(),
    price: cleanText(price, 80),
    reason: cleanText(reason, 1000),
    status: 'considering',
  };
}

export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as PreviewBody | null;
  const requestedUrl = text(body?.url, 1000);
  if (!requestedUrl) return NextResponse.json({ error: 'Product URL is required.' }, { status: 400 });

  try {
    const url = await assertPublicUrl(requestedUrl);
    const response = await fetch(url, {
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'AndrewHoWishlist/1.0' },
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!response.ok) return NextResponse.json({ error: `The product page returned HTTP ${response.status}.` }, { status: 502 });

    const html = await readHtml(response);
    return NextResponse.json({ item: productDraft(url, html) });
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Could not read that product page.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
