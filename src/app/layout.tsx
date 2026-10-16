import type { Metadata } from 'next';
import { Epilogue } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import JsonLd from '@/components/JsonLd';
import { site } from '@/lib/site';

const epilogue = Epilogue({
  subsets: ['latin'],
  variable: '--font-epilogue',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.name,
    template: '%s | Andrew Ho',
  },
  description: site.description,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: site.url,
    title: site.name,
    description: site.description,
    siteName: site.name,
  },
  twitter: {
    card: 'summary',
    title: site.name,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={epilogue.variable}>
      <body>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Person',
                name: site.name,
                url: site.url,
                description: site.description,
                sameAs: site.sameAs,
              },
              {
                '@type': 'WebSite',
                name: site.name,
                url: site.url,
                description: site.description,
                publisher: { '@type': 'Person', name: site.name },
              },
            ],
          }}
        />
        <ThemeProvider initialTheme="dark">{children}</ThemeProvider>
      </body>
    </html>
  );
}
