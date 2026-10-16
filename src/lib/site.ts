import type { Metadata } from 'next';

export const site = {
  name: 'Andrew Ho',
  url: 'https://www.anmho.com',
  description:
    'Andrew Ho writes about applied AI, systems, software, readings, and principles for making decisions.',
  author: 'Andrew Ho',
  sameAs: ['https://github.com/anmho', 'https://linkedin.com/in/andrewmnho'],
};

export function absoluteUrl(path = '/') {
  return new URL(path, site.url).toString();
}

export function pageMetadata(
  title: string,
  description: string,
  path: string
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: absoluteUrl(path),
      title,
      description,
      siteName: site.name,
    },
  };
}
