import { redirect } from 'next/navigation';
import GoalsView, { type GoalTenet } from '@/components/GoalsView';
import { getAdminAuthMode, isAdminPageAuthenticated } from '@/lib/adminAuth';
import { getGoalChangelog } from '@/lib/goals';
import { getAllTenets } from '@/lib/tenets';
import { pageMetadata } from '@/lib/site';

export const metadata = {
  ...pageMetadata('Goals', 'Private goals journal and reflection studio.', '/goals'),
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export default async function GoalsPage() {
  if (getAdminAuthMode() === 'unconfigured' || !(await isAdminPageAuthenticated())) {
    redirect('/admin/login');
  }

  const [tenets, entries] = await Promise.all([getAllTenets(), getGoalChangelog()]);
  const summaries: GoalTenet[] = tenets.map(({ id, title, excerpt, source }) => ({
    id,
    title,
    excerpt,
    source,
  }));

  return <GoalsView tenets={summaries} entries={entries} />;
}
