import LearningsView, { type Learning } from '@/components/LearningsView';
import learningsData from '@/assets/static/json/learnings.json';

export const revalidate = 3600;

export default function LearningsPage() {
  const learnings = learningsData as Learning[];

  return <LearningsView learnings={learnings} />;
}
