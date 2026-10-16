import LearningsView, { type Learning } from '@/components/LearningsView';
import learningsData from '@/assets/static/json/learnings.json';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata(
  'Learnings',
  'A searchable collection of engineering questions, answers, and examples by Andrew Ho.',
  '/learnings'
);

export const revalidate = 3600;

export default function LearningsPage() {
  const learnings = learningsData as Learning[];

  return <LearningsView learnings={learnings} />;
}
