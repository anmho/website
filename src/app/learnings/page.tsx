import LearningsView, { type Learning } from '@/components/LearningsView';
import { listContent } from '@/lib/contentDb';

export const revalidate = 3600;

export default async function LearningsPage() {
  const records = await listContent('learning');
  const learnings: Learning[] = records.map((record) => ({
    id: record.slug,
    question: record.title,
    answer: record.body,
    date: record.date,
    tags: record.tags,
    ...(typeof record.metadata.codeSnippet === 'string' ? { codeSnippet: record.metadata.codeSnippet } : {}),
    ...(typeof record.metadata.codeLanguage === 'string' ? { codeLanguage: record.metadata.codeLanguage } : {}),
  }));

  return <LearningsView learnings={learnings} />;
}
