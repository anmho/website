import learningsData from '@/assets/static/json/learnings.json';
import LearningsView, { type Learning } from '@/components/LearningsView';
import { listContent } from '@/lib/contentDb';

export const revalidate = 3600;

export default async function LearningsPage() {
  const legacyLearnings = learningsData as Learning[];
  const records = await listContent('learning');
  const learnings = records.length
    ? records.map((record) => ({
        id: record.id,
        question: record.title,
        answer: record.body,
        date: record.date,
        tags: record.tags,
        ...(typeof record.metadata.codeSnippet === 'string' ? { codeSnippet: record.metadata.codeSnippet } : {}),
        ...(typeof record.metadata.codeLanguage === 'string' ? { codeLanguage: record.metadata.codeLanguage } : {}),
      }))
    : legacyLearnings;

  return <LearningsView learnings={learnings} />;
}
