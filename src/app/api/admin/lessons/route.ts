import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthError } from '@/lib/controlPlaneAuth';
import { createContent, isContentConflict } from '@/lib/contentDb';
import { isISODate, slugify } from '@/lib/controlPlaneStore';
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

  try {
    const lesson = await createContent({
      id: `lesson:${id}`,
      contentType: 'lesson',
      slug: id,
      title,
      date,
      excerpt: parsed.data.excerpt.trim(),
      body: parsed.data.markdownBody?.trim() || `# ${title}\n`,
      readTime: null,
      tags: [],
      metadata: parsed.data.source?.trim() ? { source: parsed.data.source.trim() } : {},
    });
    revalidatePath('/lessons');
    return NextResponse.json({ lesson: { id: lesson.slug, title: lesson.title, date: lesson.date, excerpt: lesson.excerpt, ...(typeof lesson.metadata.source === 'string' ? { source: lesson.metadata.source } : {}) } }, { status: 201 });
  } catch (error) {
    if (isContentConflict(error)) {
      return NextResponse.json({ error: `lesson already exists: ${id}` }, { status: 409 });
    }
    console.error('Failed to create lesson', error);
    return NextResponse.json({ error: 'failed to save lesson' }, { status: 500 });
  }
}
