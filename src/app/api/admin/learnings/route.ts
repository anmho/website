import { NextRequest, NextResponse } from 'next/server';
import { getAuthError } from '@/lib/controlPlaneAuth';
import { isISODate, readLearnings, slugify, writeLearnings } from '@/lib/controlPlaneStore';
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
  const learnings = await readLearnings();
  if (learnings.some((x) => x.id === id)) {
    return NextResponse.json({ error: `learning id already exists: ${id}` }, { status: 409 });
  }

  const learning = {
    id,
    question,
    answer,
    tags,
    date,
    ...(parsed.data.codeSnippet?.trim()
      ? { codeSnippet: parsed.data.codeSnippet }
      : {}),
    ...(parsed.data.codeLanguage?.trim()
      ? { codeLanguage: parsed.data.codeLanguage.trim() }
      : {}),
  };

  await writeLearnings([learning, ...learnings]);
  return NextResponse.json({ learning }, { status: 201 });
}
