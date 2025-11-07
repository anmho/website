import type { Metadata } from 'next';
import './globals.css';
import Search from '@/components/Search';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata: Metadata = {
  title: 'Andrew Ho',
  description:
    'Backend dev with a passion for high performance data intensive systems',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <ThemeProvider>
          {children}
          <Search />
        </ThemeProvider>
      </body>
    </html>
  );
}
