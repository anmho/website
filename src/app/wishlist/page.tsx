import { redirect } from 'next/navigation';
import WishlistView from '@/components/WishlistView';
import { getAdminAuthMode, isAdminPageAuthenticated } from '@/lib/adminAuth';
import { parseWishlistItems } from '@/lib/wishlist';
import seedWishlistItems from '@/assets/static/json/wishlist.json';

export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
  if (getAdminAuthMode() === 'unconfigured' || !(await isAdminPageAuthenticated())) {
    redirect('/admin/login');
  }

  return <WishlistView initialItems={parseWishlistItems(seedWishlistItems)} />;
}
