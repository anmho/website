import type { Metadata } from 'next';
import { Epilogue } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';

const epilogue = Epilogue({
  subsets: ['latin'],
  variable: '--font-epilogue',
  display: 'swap',
});

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
  return (
    <html lang="en" className={epilogue.variable}>
      <body>
        <ThemeProvider initialTheme="dark">{children}</ThemeProvider>
      </body>
    </html>
  );
}
