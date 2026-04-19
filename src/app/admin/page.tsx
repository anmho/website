import AdminConsole from '@/components/admin/AdminConsole';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminConsole />;
}
