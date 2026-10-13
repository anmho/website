import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthError } from '@/lib/controlPlaneAuth';
import { createContent, isContentConflict } from '@/lib/contentDb';
import { isISODate, slugify } from '@/lib/controlPlaneStore';
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

  try {
    const watch = await createContent({
      id,
      contentType: 'watch',
      slug: id,
      title,
      date,
      excerpt: parsed.data.excerpt.trim(),
      body: parsed.data.markdownBody?.trim() || `# ${title}\n`,
      readTime: null,
      tags: [],
      metadata: { format },
    });
    revalidatePath('/watch');
    return NextResponse.json({ watch: { id: watch.id, title: watch.title, date: watch.date, excerpt: watch.excerpt, format: typeof watch.metadata.format === 'string' ? watch.metadata.format : format } }, { status: 201 });
  } catch (error) {
    if (isContentConflict(error)) {
      return NextResponse.json({ error: `watch item already exists: ${id}` }, { status: 409 });
    }
    console.error('Failed to create watch item', error);
    return NextResponse.json({ error: 'failed to save watch item' }, { status: 500 });
  }
}
