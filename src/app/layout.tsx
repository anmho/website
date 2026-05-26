import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  const root = document.documentElement;
                  const savedTheme = localStorage.getItem('theme');
                  const theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
                  root.classList.remove(theme === 'light' ? 'dark' : 'light');
                  root.classList.add(theme);
                  root.style.colorScheme = theme;
                } catch {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
