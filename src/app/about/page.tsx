import AboutPage from '@/components/AboutPage';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata(
  'About',
  'Contact details and profile links for Andrew Ho.',
  '/about'
);

export default function AboutRoute() {
  return <AboutPage />;
}
