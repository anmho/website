import GoalsView, { type GoalTenet } from '@/components/GoalsView';
import { getGoalChangelog } from '@/lib/goals';
import { getPublicTenets } from '@/lib/tenets';

export const revalidate = 3600;

export default async function GoalsPage() {
  const [tenets, entries] = await Promise.all([getPublicTenets(), getGoalChangelog()]);
  const summaries: GoalTenet[] = tenets.map(({ id, title, excerpt, source }) => ({
    id,
    title,
    excerpt,
    source,
  }));

  return <GoalsView tenets={summaries} entries={entries} />;
}
