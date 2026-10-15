import { redirect } from 'next/navigation';
import DecisionsView from '@/components/DecisionsView';
import { getAdminAuthMode, isAdminPageAuthenticated } from '@/lib/adminAuth';
import { getAllTenets } from '@/lib/tenets';
import { getDecisionExample } from '@/lib/decisionExample.server';

export const dynamic = 'force-dynamic';

export default async function DecisionsPage() {
  if (getAdminAuthMode() === 'unconfigured' || !(await isAdminPageAuthenticated())) {
    redirect('/admin/login');
  }

  const tenets = await getAllTenets();
  return <DecisionsView initialExample={await getDecisionExample()} tenets={tenets.map(({ id, title, tags }) => ({ id, title, private: tags?.includes('private') ?? false }))} />;
}
