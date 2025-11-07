'use client';

import Link from 'next/link';
import { BsAsterisk } from 'react-icons/bs';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

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

      <div className="h-full flex justify-center align-center flex-row pr-10 items-center gap-4">
        <Link
          href="/articles"
          className={cn(
            'h-full flex justify-center align-center flex-col py-10 px-3 transition-colors cursor-pointer',
            'dark:text-white text-gray-900',
            'dark:hover:text-gray-400 hover:text-gray-600'
          )}
        >
          Articles
        </Link>
        <Link
          href="/notes"
          className={cn(
            'h-full flex justify-center align-center flex-col py-10 px-3 transition-colors cursor-pointer',
            'dark:text-white text-gray-900',
            'dark:hover:text-gray-400 hover:text-gray-600'
          )}
        >
          Notes
        </Link>
        <Link
          href="/projects"
          className={cn(
            'h-full flex justify-center align-center flex-col py-10 px-3 transition-colors cursor-pointer',
            'dark:text-white text-gray-900',
            'dark:hover:text-gray-400 hover:text-gray-600'
          )}
        >
          Projects
        </Link>
        <Link
          href="/about"
          className={cn(
            'h-full flex justify-center align-center flex-col py-10 px-3 transition-colors cursor-pointer',
            'dark:text-white text-gray-900',
            'dark:hover:text-gray-400 hover:text-gray-600'
          )}
        >
          About
        </Link>
        <button
          onClick={toggleTheme}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'dark:text-white text-gray-900',
            'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>
      </div>
    </div>
  );
}

export default Navbar;
