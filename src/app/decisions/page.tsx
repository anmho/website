import { redirect } from 'next/navigation';
import DecisionsView from '@/components/DecisionsView';
import { isAdminAuthConfigured, isAdminPageAuthenticated } from '@/lib/adminAuth';
import { getAllTenets } from '@/lib/tenets';

export const dynamic = 'force-dynamic';

export default async function DecisionsPage() {
  if (!isAdminAuthConfigured() || !(await isAdminPageAuthenticated())) {
    redirect('/admin/login');
  }

  const tenets = await getAllTenets();
  return <DecisionsView tenets={tenets.map(({ id, title, tags }) => ({ id, title, private: tags?.includes('private') ?? false }))} />;
}
