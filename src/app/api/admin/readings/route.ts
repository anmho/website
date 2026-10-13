import { NextRequest, NextResponse } from 'next/server';
import { getAuthError } from '@/lib/controlPlaneAuth';
import { isISODate, readReadings, slugify, writeReadingMarkdown, writeReadings } from '@/lib/controlPlaneStore';
import { createReadingRequestSchema } from '../../../../../packages/contracts/src/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authError = getAuthError(req);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: authError === 'unauthorized' ? 401 : 500 });
  }

  const parsed = createReadingRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'invalid body' }, { status: 400 });
  }

  const title = parsed.data.title.trim();
  const date = parsed.data.date?.trim() || new Date().toISOString().slice(0, 10);
  const id = `${date}-${slugify(title)}`;
  const author = parsed.data.author?.trim() || 'Unknown author';
  if (!isISODate(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });

  const items = await readReadings();
  if (items.some((item) => item.id === id)) return NextResponse.json({ error: `reading already exists: ${id}` }, { status: 409 });

  const reading = { id, title, date, excerpt: parsed.data.excerpt.trim(), author };
  await writeReadings([reading, ...items]);
  await writeReadingMarkdown(id, title, parsed.data.markdownBody);
  return NextResponse.json({ reading }, { status: 201 });
}
