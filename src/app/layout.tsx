import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';

type Theme = 'light' | 'dark';

export const metadata: Metadata = {
  title: 'Andrew Ho',
  description:
    'Backend dev with a passion for high performance data intensive systems',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const savedTheme = cookies().get('theme')?.value;
  const initialTheme: Theme = savedTheme === 'light' ? 'light' : 'dark';

  return (
    <html lang="en">
      <body>
        <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
