import { redirect } from 'next/navigation';
import AdminLoginView from '@/components/AdminLoginView';
import { getAdminAuthMode, isAdminPageAuthenticated } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const mode = getAdminAuthMode();
  if (mode === 'cloudflare' && (await isAdminPageAuthenticated())) {
    redirect('/decisions');
  }

  return <AdminLoginView mode={mode} />;
}
