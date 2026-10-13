import { NextRequest, NextResponse } from 'next/server';
import { getAuthError } from '@/lib/controlPlaneAuth';
import { isISODate, readLessons, slugify, writeLessonMarkdown, writeLessons } from '@/lib/controlPlaneStore';
import { createLessonRequestSchema } from '../../../../../packages/contracts/src/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authError = getAuthError(req);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: authError === 'unauthorized' ? 401 : 500 });
  }

  const parsed = createLessonRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'invalid body' }, { status: 400 });
  }

  const title = parsed.data.title.trim();
  const date = parsed.data.date?.trim() || new Date().toISOString().slice(0, 10);
  const id = `${date}-${slugify(title)}`;
  if (!isISODate(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });

  const lessons = await readLessons();
  if (lessons.some((lesson) => lesson.id === id)) {
    return NextResponse.json({ error: `lesson already exists: ${id}` }, { status: 409 });
  }

  const lesson = {
    id,
    title,
    date,
    excerpt: parsed.data.excerpt.trim(),
    ...(parsed.data.source?.trim() ? { source: parsed.data.source.trim() } : {}),
  };
  await writeLessons([lesson, ...lessons]);
  await writeLessonMarkdown(id, title, parsed.data.markdownBody);
  return NextResponse.json({ lesson }, { status: 201 });
}
