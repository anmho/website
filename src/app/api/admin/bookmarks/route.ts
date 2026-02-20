import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthError } from '@/lib/controlPlaneAuth';
import { upsertBookmark } from '@/lib/bookmarksDb';
import {
  bookmarkMetadataSchema,
  createBookmarkRequestSchema,
} from '../../../../../packages/contracts/src/admin';

export const runtime = 'nodejs';

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1]?.trim() || '';
}

function extractMetaDescription(html: string): string {
  const m = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
  );
  if (m?.[1]) return m[1].trim();
  const og = html.match(
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
  );
  return og?.[1]?.trim() || '';
}

export async function POST(req: NextRequest) {
  const authError = getAuthError(req);
  if (authError) {
    return NextResponse.json(
      { error: authError },
      { status: authError === 'unauthorized' ? 401 : 500 }
    );
  }

  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY is required' },
      { status: 500 }
    );
  }

  const json = await req.json();
  const parsed = createBookmarkRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'invalid body' },
      { status: 400 }
    );
  }

  const url = parsed.data.url;

  let html = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; websitectl-bot/1.0; +https://github.com)',
      },
      redirect: 'follow',
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `failed to fetch url (${res.status})` },
        { status: 400 }
      );
    }
    html = await res.text();
  } catch (err) {
    return NextResponse.json(
      { error: `failed to fetch url: ${String(err)}` },
      { status: 400 }
    );
  }

  const extractedTitle = extractTitle(html);
  const extractedDescription = extractMetaDescription(html);
  const pageText = stripHtml(html).slice(0, 16000);

  const openrouter = createOpenAI({
    apiKey: openRouterApiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_SITE_NAME || 'Website Admin',
    },
  });

  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  const { object } = await generateObject({
    model: openrouter(model),
    schema: bookmarkMetadataSchema,
    prompt: `You extract bookmark metadata for a personal engineering website.

URL: ${url}
HTML <title>: ${extractedTitle || '(missing)'}
Meta description: ${extractedDescription || '(missing)'}

Page text (truncated):
${pageText}

Rules:
- Prefer precise, non-hype phrasing.
- Description should be concise and useful.
- Category should be topical (e.g., "Distributed Systems") or source-domain if unknown.
- Tags should be lower-case short phrases.`,
  });

  await upsertBookmark({
    title: object.title,
    description: object.description,
    category: object.category,
    format: object.format,
    url,
    author: object.author,
    tags: object.tags,
  });

  return NextResponse.json(
    {
      ok: true,
      url,
      bookmark: object,
      storage: 'db',
    },
    { status: 201 }
  );
}
