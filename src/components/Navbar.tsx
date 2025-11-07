'use client';

import Link from 'next/link';
import { BsAsterisk } from 'react-icons/bs';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import Search from './Search';

const NAV_LINKS = [
  { href: '/articles', label: 'Articles' },
  { href: '/notes', label: 'Notes' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
];

function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className={cn(
        'w-full fixed top-0 left-0 h-24 flex justify-between align-center backdrop-blur z-50',
        'dark:bg-black/50 bg-white/80 border-b border-gray-200 dark:border-transparent'
      )}
    >
      <Link
        href="/"
        className="h-full flex justify-center align-center flex-col p-10 cursor-pointer group"
      >
        <BsAsterisk
          size={20}
          className={cn(
            'group-hover:rotate-12 transition-transform duration-200',
            'dark:text-white text-gray-900'
          )}
        />
      </Link>

      <div className="h-full flex justify-center align-center flex-row items-center gap-3 sm:gap-4 pr-6 sm:pr-10">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'h-full flex justify-center align-center flex-col px-3 transition-colors cursor-pointer text-sm sm:text-base font-medium',
              'dark:text-white text-gray-900',
              'dark:hover:text-gray-400 hover:text-gray-600'
            )}
          >
            {link.label}
          </Link>
        ))}

        <Search
          placeholder="Search"
          className="hidden sm:inline-flex !h-9 !px-4 !py-1.5"
          showShortcut
        />

        <Search
          placeholder="Search"
          iconOnly
          showShortcut={false}
          className="sm:hidden !h-10 !w-10"
        />

        <button
          onClick={toggleTheme}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'dark:text-white text-gray-900',
            'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
          aria-label="Toggle theme"
          type="button"
        >
          {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>
      </div>
    </div>
  );
}

export default Navbar;
