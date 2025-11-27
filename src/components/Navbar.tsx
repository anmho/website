'use client';

import Link from 'next/link';
import { BsAsterisk } from 'react-icons/bs';
import { FiSun, FiMoon, FiMenu, FiX } from 'react-icons/fi';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import Search from './Search';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { href: '/articles', label: 'Articles' },
  { href: '/notes', label: 'Notes' },
  { href: '/about', label: 'About' },
  { href: '/resources', label: 'Bookmarks' },
];

const NAV_LINKS_MOBILE = [
  { href: '/', label: 'Home' },
  { href: '/articles', label: 'Articles' },
  { href: '/notes', label: 'Notes' },
  { href: '/about', label: 'About' },
  { href: '/resources', label: 'Bookmarks' },
];

function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = useMemo(() => {
    return isMobileMenuOpen ? NAV_LINKS_MOBILE : NAV_LINKS;
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Lock body scroll when mobile menu is open
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <div
        className={cn(
          'w-full fixed top-0 left-0 h-24 flex justify-between align-center z-50 transition-all duration-300',
          isScrolled
            ? 'backdrop-blur-xl dark:bg-black/50 bg-[#f4efe6]/90 border-b border-gray-200/30 dark:border-transparent'
            : 'bg-transparent border-b border-transparent'
        )}
      >
        {/* Desktop: Asterisk, Mobile: Hamburger */}
        <div className="h-full flex items-center pl-6 sm:pl-10">
          <Link
            href="/"
            className="hidden sm:flex h-full justify-center align-center flex-col cursor-pointer group"
          >
            <BsAsterisk
              size={20}
              className={cn(
                'group-hover:rotate-12 transition-transform duration-200',
                'dark:text-white text-gray-900'
              )}
            />
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              'sm:hidden p-2 rounded-lg transition-colors relative',
              'dark:text-white text-gray-900',
              'hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
            )}
            aria-label="Toggle menu"
            type="button"
          >
            <div className="relative w-6 h-6">
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <FiX size={24} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <FiMenu size={24} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="h-full hidden sm:flex justify-center align-center flex-row items-center gap-3 sm:gap-4 pr-6 sm:pr-10">
          {links.map((link) => (
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
            iconOnly
            showShortcut={false}
            className="!h-10 !w-10 rounded-full"
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

        {/* Mobile: Search and Theme */}
        <div className="h-full sm:hidden flex items-center gap-2 pr-4">
          <Search
            placeholder="Search"
            iconOnly
            showShortcut={false}
            className="!h-10 !w-10 rounded-full"
          />
          <button
            onClick={toggleTheme}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'dark:text-white text-gray-900',
              'hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
            )}
            aria-label="Toggle theme"
            type="button"
          >
            {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Fullscreen */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.59, 0.08, 0.58, 1] }}
            className={cn(
              'fixed inset-0 z-[70] sm:hidden',
              'backdrop-blur-xl dark:bg-black/95 bg-[#f4efe6]/95'
            )}
          >
            <div className="flex flex-col h-full pt-24 px-8">
              <button
                onClick={closeMobileMenu}
                className={cn(
                  'absolute top-6 left-6 p-2 rounded-lg transition-colors',
                  'dark:text-white text-gray-900',
                  'hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                )}
                aria-label="Close menu"
                type="button"
              >
                <FiX size={24} />
              </button>
              <nav className="flex-1 flex flex-col justify-center">
                {NAV_LINKS.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      opacity: {
                        duration: 0.6,
                        delay: index * 0.06,
                        ease: 'easeOut',
                      },
                      y: {
                        duration: 0.6,
                        delay: index * 0.06,
                        ease: 'easeOut',
                      },
                    }}
                  >
                    <Link
                      href={link.href}
                      onClick={closeMobileMenu}
                      className={cn(
                        'block py-6 text-2xl font-medium transition-colors',
                        'dark:text-white text-gray-900',
                        'dark:hover:text-gray-400 hover:text-gray-600'
                      )}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
