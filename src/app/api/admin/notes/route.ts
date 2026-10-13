import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthError } from '@/lib/controlPlaneAuth';
import { createContent, isContentConflict } from '@/lib/contentDb';
import { isISODate, slugify } from '@/lib/controlPlaneStore';
import { createNoteRequestSchema } from '../../../../../packages/contracts/src/admin';

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
  const parsed = createNoteRequestSchema.safeParse(json);
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
  const readTime = parsed.data.readTime?.trim() || '5 min read';

  if (!isISODate(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });

  try {
    const note = await createContent({
      id: `note:${slug}`,
      contentType: 'note',
      slug,
      title,
      date,
      excerpt,
      body: parsed.data.markdownBody?.trim() || `# ${title}\n`,
      readTime,
      tags: [],
      metadata: {},
    });
    revalidatePath('/notes');
    revalidatePath(`/notes/${slug}`);
    return NextResponse.json({ note: { slug: note.slug, title: note.title, date: note.date, excerpt: note.excerpt, readTime: note.readTime || readTime } }, { status: 201 });
  } catch (error) {
    if (isContentConflict(error)) {
      return NextResponse.json({ error: `note slug already exists: ${slug}` }, { status: 409 });
    }
    console.error('Failed to create note', error);
    return NextResponse.json({ error: 'failed to save note' }, { status: 500 });
  }
}
