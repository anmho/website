import { NextRequest, NextResponse } from 'next/server';
import { getAuthError } from '@/lib/controlPlaneAuth';
import { isISODate, readWatch, slugify, writeWatch, writeWatchMarkdown } from '@/lib/controlPlaneStore';
import { createWatchRequestSchema } from '../../../../../packages/contracts/src/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authError = getAuthError(req);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: authError === 'unauthorized' ? 401 : 500 });
  }

  const parsed = createWatchRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'invalid body' }, { status: 400 });
  }

  const title = parsed.data.title.trim();
  const date = parsed.data.date?.trim() || new Date().toISOString().slice(0, 10);
  const id = `${date}-${slugify(title)}`;
  const format = parsed.data.format?.trim() || 'video';
  if (!isISODate(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });

  const items = await readWatch();
  if (items.some((item) => item.id === id)) return NextResponse.json({ error: `watch item already exists: ${id}` }, { status: 409 });

  const watch = { id, title, date, excerpt: parsed.data.excerpt.trim(), format };
  await writeWatch([watch, ...items]);
  await writeWatchMarkdown(id, title, parsed.data.markdownBody);
  return NextResponse.json({ watch }, { status: 201 });
}
