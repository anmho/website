import { NextRequest, NextResponse } from 'next/server';
import { getAuthError } from '@/lib/controlPlaneAuth';
import {
  isISODate,
  readArticlesMeta,
  slugify,
  writeArticleMarkdown,
  writeArticlesMeta,
} from '@/lib/controlPlaneStore';
import { createArticleRequestSchema } from '../../../../../packages/contracts/src/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authError = getAuthError(req);
  if (authError) {
    return NextResponse.json(
      { error: authError },
      { status: authError === 'unauthorized' ? 401 : 500 }
    );
  }

  const json = await req.json();
  const parsed = createArticleRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'invalid body' },
      { status: 400 }
    );
  }

  const title = parsed.data.title.trim();
  const excerpt = parsed.data.excerpt.trim();
  const date = parsed.data.date?.trim() || new Date().toISOString().slice(0, 10);
  const slug = parsed.data.slug?.trim() || slugify(title);
  const readTime = parsed.data.readTime?.trim() || '8 min read';

  if (!isISODate(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });

  const articles = await readArticlesMeta();
  if (articles.some((a) => a.slug === slug)) {
    return NextResponse.json({ error: `article slug already exists: ${slug}` }, { status: 409 });
  }

  const article = { slug, title, date, excerpt, readTime };
  await writeArticlesMeta([article, ...articles]);
  await writeArticleMarkdown(slug, title, parsed.data.markdownBody);
  return NextResponse.json({ article }, { status: 201 });
}
