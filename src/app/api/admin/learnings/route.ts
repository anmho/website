import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthError } from '@/lib/controlPlaneAuth';
import { createContent, isContentConflict } from '@/lib/contentDb';
import { isISODate, slugify } from '@/lib/contentUtils';
import { createLearningRequestSchema } from '../../../../../packages/contracts/src/admin';

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
  const parsed = createLearningRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'invalid body' },
      { status: 400 }
    );
  }

  const question = parsed.data.question.trim();
  const answer = parsed.data.answer.trim();
  const tags = parsed.data.tags
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
  const date = parsed.data.date?.trim() || new Date().toISOString().slice(0, 10);

  if (!isISODate(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });

  const id = `${date}-${slugify(question)}`;
  try {
    const learning = await createContent({
      id: `learning:${id}`,
      contentType: 'learning',
      slug: id,
      title: question,
      excerpt: '',
      body: answer,
      date,
      readTime: null,
      tags,
      metadata: {
        ...(parsed.data.codeSnippet?.trim() ? { codeSnippet: parsed.data.codeSnippet } : {}),
        ...(parsed.data.codeLanguage?.trim() ? { codeLanguage: parsed.data.codeLanguage.trim() } : {}),
      },
    });
    const response = {
      id: learning.slug,
      question: learning.title,
      answer: learning.body,
      tags: learning.tags,
      date: learning.date,
      ...(typeof learning.metadata.codeSnippet === 'string' ? { codeSnippet: learning.metadata.codeSnippet } : {}),
      ...(typeof learning.metadata.codeLanguage === 'string' ? { codeLanguage: learning.metadata.codeLanguage } : {}),
    };
    revalidatePath('/learnings');
    return NextResponse.json({ learning: response }, { status: 201 });
  } catch (error) {
    if (isContentConflict(error)) {
      return NextResponse.json({ error: `learning id already exists: ${id}` }, { status: 409 });
    }
    console.error('Failed to create learning', error);
    return NextResponse.json({ error: 'failed to save learning' }, { status: 500 });
  }
}
