import ProjectsPage from '@/components/ProjectsPage';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata(
  'Projects',
  'Selected projects by Andrew Ho, spanning systems, software, and applications.',
  '/projects'
);

export default function ProjectsRoute() {
  return <ProjectsPage />;
}
