import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { NextResponse } from 'next/server';
import { isAdminRequestAuthenticated } from '@/lib/adminAuth';
import type { WishlistItemDraft } from '@/lib/wishlist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_HTML_BYTES = 2_000_000;
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape';
const FIRECRAWL_TIMEOUT_MS = 5_000;

type PreviewBody = { url?: unknown };
type ProductMetadata = {
  name?: string;
  maker?: string;
  category?: string;
  description?: string;
  price?: string;
  currency?: string;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, maxLength: number): string {
  if (typeof value === 'number') return String(value).slice(0, maxLength);
  return typeof value === 'string' ? cleanText(value, maxLength) : '';
}

function nestedString(value: unknown, key: string, maxLength: number): string {
  if (typeof value === 'string' || typeof value === 'number') return stringValue(value, maxLength);
  if (isRecord(value)) return stringValue(value[key], maxLength);
  return '';
}

function jsonLdRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(jsonLdRecords);
  if (!isRecord(value)) return [];
  return [value, ...Object.values(value).flatMap(jsonLdRecords)];
}

function jsonLdProduct(html: string): ProductMetadata {
  for (const script of html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || []) {
    const content = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    try {
      const product = jsonLdRecords(JSON.parse(content)).find((candidate) => {
        const type = candidate['@type'];
        return (Array.isArray(type) ? type : [type]).some((value) => value === 'Product');
      });
      if (!product) continue;

      const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
      const brand = nestedString(product.brand, 'name', 120) || nestedString(product.manufacturer, 'name', 120);
      return {
        name: stringValue(product.name, 160),
        maker: brand,
        category: stringValue(product.category, 80),
        description: stringValue(product.description, 1000),
        price: nestedString(offers, 'price', 80) || nestedString(product.price, 'value', 80),
        currency: nestedString(offers, 'priceCurrency', 20) || nestedString(product.priceCurrency, 'value', 20),
      };
    } catch {
      continue;
    }
  }
  return {};
}

function itemPropValue(html: string, name: string, maxLength: number): string {
  const match = html.match(new RegExp(`<([a-z0-9]+)\\b[^>]*itemprop\\s*=\\s*["'][^"']*\\b${name}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i'));
  return match ? cleanText(match[2].replace(/<[^>]+>/g, ' '), maxLength) : '';
}

function visiblePrice(html: string): string {
  const visibleText = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\\s+/g, ' ');
  const match = visibleText.match(/(?:sale\\s+price|price|now|from)\\s*[:\\-]?\\s*((?:[$€£¥]\\s*)?\\d[\\d,.]*(?:\\s?(?:USD|CAD|AUD|EUR|GBP|JPY))?)/i);
  return match ? cleanText(match[1], 80) : '';
}

function formatPrice(rawPrice: string, currency: string): string {
  const price = cleanText(rawPrice, 80);
  if (!price) return '';
  if (/[[$€£¥]]/.test(price) || (currency && price.toUpperCase().includes(currency.toUpperCase()))) return price;
  return `${currency ? `${currency} ` : ''}${price}`;
}

async function firecrawlContent(url: URL): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) return '';

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url.toString(),
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      }),
      signal: AbortSignal.timeout(FIRECRAWL_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) return '';

    const payload = await response.json() as { data?: { html?: unknown; markdown?: unknown } };
    const html = typeof payload.data?.html === 'string' ? payload.data.html : '';
    const markdown = typeof payload.data?.markdown === 'string' ? payload.data.markdown : '';
    return `${html}\n${markdown}`.slice(0, MAX_HTML_BYTES);
  } catch {
    return '';
  }
}

function mergeDraft(base: WishlistItemDraft, fallback: WishlistItemDraft): WishlistItemDraft {
  return {
    ...base,
    name: base.name === base.url ? fallback.name : base.name,
    maker: base.maker || fallback.maker,
    category: base.category || fallback.category,
    price: base.price || fallback.price,
    reason: base.reason.startsWith('Imported from ') ? fallback.reason || base.reason : base.reason,
  };
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
  const structured = jsonLdProduct(html);
  const siteName = metaValue(html, ['og:site_name', 'application-name']) || url.hostname.replace(/^www\./, '');
  const name = metaValue(html, ['og:title', 'twitter:title']) || structured.name || titleValue(html) || url.hostname;
  const reason = metaValue(html, ['og:description', 'twitter:description', 'description']) || structured.description || `Imported from ${siteName}.`;
  const category = metaValue(html, ['product:category', 'category']) || structured.category || itemPropValue(html, 'category', 80);
  const rawPrice = metaValue(html, ['product:price:amount', 'og:price:amount', 'price']) || structured.price || itemPropValue(html, 'price', 80) || visiblePrice(html);
  const currency = metaValue(html, ['product:price:currency', 'og:price:currency', 'priceCurrency']) || structured.currency || itemPropValue(html, 'priceCurrency', 20);
  const price = formatPrice(rawPrice, currency);

  return {
    name: cleanText(name, 160),
    maker: cleanText(structured.maker || siteName, 120),
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
    let draft: WishlistItemDraft | null = null;
    let directError = 'Could not read that product page.';

    try {
      const response = await fetch(url, {
        headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'AndrewHoWishlist/1.0' },
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (response.ok) {
        draft = productDraft(url, await readHtml(response));
      } else {
        directError = `The product page returned HTTP ${response.status}.`;
      }
    } catch (error) {
      directError = error instanceof Error && error.message ? error.message : directError;
    }

    if (!draft || !draft.price) {
      const renderedContent = await firecrawlContent(url);
      if (renderedContent) {
        const renderedDraft = productDraft(url, renderedContent);
        draft = draft ? mergeDraft(draft, renderedDraft) : renderedDraft;
      }
    }

    if (!draft) return NextResponse.json({ error: directError }, { status: 502 });
    return NextResponse.json({ item: draft });
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Could not read that product page.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
