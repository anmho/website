import type { MetadataRoute } from 'next';
import { absoluteUrl, site } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/goals', '/api/decisions', '/api/goals', '/api/cron/'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: site.url,
  };
}
