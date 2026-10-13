import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthError } from '@/lib/controlPlaneAuth';
import { createContent, isContentConflict } from '@/lib/contentDb';
import { isISODate, slugify } from '@/lib/controlPlaneStore';
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

  try {
    const reading = await createContent({
      id,
      contentType: 'reading',
      slug: id,
      title,
      date,
      excerpt: parsed.data.excerpt.trim(),
      body: parsed.data.markdownBody?.trim() || `# ${title}\n`,
      readTime: null,
      tags: [],
      metadata: { author },
    });
    revalidatePath('/readings');
    return NextResponse.json({ reading: { id: reading.id, title: reading.title, date: reading.date, excerpt: reading.excerpt, author: typeof reading.metadata.author === 'string' ? reading.metadata.author : author } }, { status: 201 });
  } catch (error) {
    if (isContentConflict(error)) {
      return NextResponse.json({ error: `reading already exists: ${id}` }, { status: 409 });
    }
    console.error('Failed to create reading', error);
    return NextResponse.json({ error: 'failed to save reading' }, { status: 500 });
  }
}
