'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BsAsterisk } from 'react-icons/bs';
import { FiChevronDown, FiMenu, FiMoon, FiSun, FiX } from 'react-icons/fi';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import Search from './Search';

type NavGroupId = 'writing' | 'reflections' | 'library';

type NavItem = {
  href: string;
  label: string;
};

type NavGroup = {
  id: NavGroupId;
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'writing',
    label: 'Writing',
    items: [
      { href: '/articles', label: 'Articles' },
      { href: '/notes', label: 'Notes' },
    ],
  },
  {
    id: 'reflections',
    label: 'Reflections',
    items: [
      { href: '/learnings', label: 'Learnings' },
      { href: '/tenets', label: 'Tenets' },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    items: [
      { href: '/readings', label: 'Readings' },
      { href: '/watch', label: 'Watch' },
      { href: '/resources', label: 'Bookmarks' },
    ],
  },
];

const INITIAL_MENU_ITEM_REFS: Record<NavGroupId, Array<HTMLAnchorElement | null>> = {
  writing: [],
  reflections: [],
  library: [],
};

function isPathActive(pathname: string | null, href: string) {
  return pathname === href || pathname?.startsWith(`${href}/`) === true;
}

function groupIsActive(pathname: string | null, group: NavGroup) {
  return group.items.some((item) => isPathActive(pathname, item.href));
}

function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<NavGroupId | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const groupButtonRefs = useRef<Record<NavGroupId, HTMLButtonElement | null>>({
    writing: null,
    reflections: null,
    library: null,
  });
  const menuItemRefs = useRef<Record<NavGroupId, Array<HTMLAnchorElement | null>>>(
    INITIAL_MENU_ITEM_REFS
  );

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        openGroup &&
        navRef.current &&
        !navRef.current.contains(event.target as Node)
      ) {
        setOpenGroup(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openGroup]);

  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        setOpenGroup(null);
        mobileMenuButtonRef.current?.focus();
        return;
      }

      if (openGroup) {
        setOpenGroup(null);
        groupButtonRefs.current[openGroup]?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen, openGroup]);

  const focusMenuItem = (groupId: NavGroupId, index: number) => {
    window.requestAnimationFrame(() => {
      menuItemRefs.current[groupId][index]?.focus();
    });
  };

  const handleGroupKeyDown = (
    groupId: NavGroupId,
    event: KeyboardEvent<HTMLButtonElement>,
    focusItems: boolean
  ) => {
    const group = NAV_GROUPS.find((item) => item.id === groupId);
    if (!group) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpenGroup(null);
      groupButtonRefs.current[groupId]?.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      setOpenGroup(groupId);
      if (focusItems) focusMenuItem(groupId, 0);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpenGroup(groupId);
      if (focusItems) focusMenuItem(groupId, group.items.length - 1);
    }
  };

  const handleMenuKeyDown = (
    groupId: NavGroupId,
    itemIndex: number,
    event: KeyboardEvent<HTMLAnchorElement>
  ) => {
    const group = NAV_GROUPS.find((item) => item.id === groupId);
    if (!group) return;

    const lastIndex = group.items.length - 1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusMenuItem(groupId, itemIndex === lastIndex ? 0 : itemIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusMenuItem(groupId, itemIndex === 0 ? lastIndex : itemIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusMenuItem(groupId, 0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusMenuItem(groupId, lastIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpenGroup(null);
      groupButtonRefs.current[groupId]?.focus();
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setOpenGroup(null);
  };

  const linkClassName = (active: boolean) =>
    cn(
      'relative flex items-center gap-1 px-3 text-sm font-medium transition-colors',
      'after:absolute after:inset-x-3 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-150',
      'text-gray-900/75 hover:text-gray-900 after:text-gray-900',
      'dark:text-white/80 dark:hover:text-white dark:after:text-white',
      active && 'font-semibold text-gray-900 after:scale-x-100 dark:text-white'
    );

  const childLinkClassName = (active: boolean) =>
    cn(
      'block px-5 py-4 text-lg transition-colors',
      'text-gray-900/70 hover:bg-black/[0.035] hover:text-gray-900',
      'dark:text-white/70 dark:hover:bg-white/[0.04] dark:hover:text-white',
      active &&
        'bg-black/[0.04] font-medium text-gray-900 dark:bg-white/[0.06] dark:text-white'
    );

  return (
    <>
      <div
        ref={navRef}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-24 w-full items-center justify-between transition-all duration-300',
          isScrolled
            ? 'border-b border-gray-200/30 bg-[#f4efe6]/90 backdrop-blur-xl dark:border-transparent dark:bg-black/50'
            : 'border-b border-transparent bg-transparent'
        )}
      >
        <div className="flex h-full items-center pl-6 sm:pl-10">
          <Link
            href="/"
            className="group hidden h-full cursor-pointer flex-col justify-center sm:flex"
            aria-label="Home"
          >
            <BsAsterisk
              size={20}
              className={cn(
                'transition-transform duration-200 group-hover:rotate-12',
                'text-gray-900 dark:text-white'
              )}
            />
          </Link>
          <button
            ref={mobileMenuButtonRef}
            onClick={() => {
              setIsMobileMenuOpen((isOpen) => !isOpen);
              setOpenGroup(null);
            }}
            className={cn(
              'relative rounded-lg p-2 transition-colors sm:hidden',
              'text-gray-900 hover:bg-gray-100/50 dark:text-white dark:hover:bg-gray-800/50'
            )}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            type="button"
          >
            <div className="relative h-6 w-6">
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

        <nav
          aria-label="Primary navigation"
          className="hidden h-full items-center gap-1 pr-6 sm:flex sm:gap-2 sm:pr-10"
        >
          {NAV_GROUPS.map((group) => {
            const isActive = groupIsActive(pathname, group);
            const isOpen = openGroup === group.id;
            const triggerId = `desktop-${group.id}-trigger`;
            const menuId = `desktop-${group.id}-menu`;

            return (
              <div key={group.id} className="relative flex h-full items-center">
                <button
                  ref={(node) => {
                    groupButtonRefs.current[group.id] = node;
                  }}
                  id={triggerId}
                  type="button"
                  className={linkClassName(isActive)}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  aria-controls={menuId}
                  onClick={() => setOpenGroup(isOpen ? null : group.id)}
                  onKeyDown={(event) => handleGroupKeyDown(group.id, event, true)}
                >
                  {group.label}
                  <motion.span
                    aria-hidden="true"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <FiChevronDown size={14} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={menuId}
                      role="menu"
                      aria-labelledby={triggerId}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.14, ease: 'easeOut' }}
                      className={cn(
                        'absolute left-1/2 top-[calc(100%-0.75rem)] min-w-56 -translate-x-1/2 overflow-hidden border shadow-none',
                        'rounded-[4px] border-gray-200/80 bg-[#f4efe6]/95 backdrop-blur-xl',
                        'dark:border-white/15 dark:bg-[#0c0c0c]/95'
                      )}
                    >
                      {group.items.map((item, itemIndex) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          ref={(node) => {
                            menuItemRefs.current[group.id][itemIndex] = node;
                          }}
                          aria-current={
                            isPathActive(pathname, item.href) ? 'page' : undefined
                          }
                          className={childLinkClassName(
                            isPathActive(pathname, item.href)
                          )}
                          onClick={() => setOpenGroup(null)}
                          onKeyDown={(event) =>
                            handleMenuKeyDown(group.id, itemIndex, event)
                          }
                        >
                          {item.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <Link
            href="/about"
            className={linkClassName(isPathActive(pathname, '/about'))}
            aria-current={isPathActive(pathname, '/about') ? 'page' : undefined}
          >
            About
          </Link>

          <Search
            placeholder="Search"
            iconOnly
            showShortcut={false}
            className="!h-10 !w-10 rounded-full"
          />

          <button
            onClick={toggleTheme}
            className={cn(
              'rounded-lg p-2 transition-colors',
              'text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800'
            )}
            aria-label="Toggle theme"
            type="button"
          >
            {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
        </nav>

        <div className="flex h-full items-center gap-2 pr-4 sm:hidden">
          <Search
            placeholder="Search"
            iconOnly
            showShortcut={false}
            className="!h-10 !w-10 rounded-full"
          />
          <button
            onClick={toggleTheme}
            className={cn(
              'rounded-lg p-2 transition-colors',
              'text-gray-900 hover:bg-gray-100/50 dark:text-white dark:hover:bg-gray-800/50'
            )}
            aria-label="Toggle theme"
            type="button"
          >
            {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.59, 0.08, 0.58, 1] }}
            className={cn(
              'fixed inset-0 z-[70] sm:hidden',
              'bg-[#f4efe6]/95 backdrop-blur-xl dark:bg-black/95'
            )}
          >
            <div className="flex h-full flex-col px-8 pt-24">
              <button
                onClick={closeMobileMenu}
                className={cn(
                  'absolute left-6 top-6 rounded-lg p-2 transition-colors',
                  'text-gray-900 hover:bg-gray-100/50 dark:text-white dark:hover:bg-gray-800/50'
                )}
                aria-label="Close menu"
                type="button"
              >
                <FiX size={24} />
              </button>

              <nav aria-label="Mobile primary navigation" className="flex flex-1 flex-col justify-center overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <Link
                    href="/"
                    onClick={closeMobileMenu}
                    className={cn(
                      'block py-6 text-2xl font-medium transition-colors',
                      'text-gray-900 hover:text-gray-600 dark:text-white dark:hover:text-gray-400'
                    )}
                  >
                    Home
                  </Link>
                </motion.div>

                {NAV_GROUPS.map((group, groupIndex) => {
                  const isOpen = openGroup === group.id;
                  const isActive = groupIsActive(pathname, group);
                  const triggerId = `mobile-${group.id}-trigger`;
                  const menuId = `mobile-${group.id}-menu`;

                  return (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: (groupIndex + 1) * 0.06, ease: 'easeOut' }}
                    >
                      <button
                        ref={(node) => {
                          groupButtonRefs.current[group.id] = node;
                        }}
                        id={triggerId}
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between py-5 text-left text-2xl font-medium',
                          'text-gray-900 dark:text-white',
                          isActive && 'font-semibold'
                        )}
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        aria-controls={menuId}
                        onClick={() => setOpenGroup(isOpen ? null : group.id)}
                        onKeyDown={(event) => handleGroupKeyDown(group.id, event, false)}
                      >
                        <span>{group.label}</span>
                        <motion.span
                          aria-hidden="true"
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <FiChevronDown size={20} />
                        </motion.span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            id={menuId}
                            role="menu"
                            aria-labelledby={triggerId}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="overflow-hidden pl-3"
                          >
                            {group.items.map((item, itemIndex) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                role="menuitem"
                                ref={(node) => {
                                  menuItemRefs.current[group.id][itemIndex] = node;
                                }}
                                aria-current={
                                  isPathActive(pathname, item.href) ? 'page' : undefined
                                }
                                className={cn(
                                  'block py-3 text-lg transition-colors',
                                  'text-gray-900/65 hover:text-gray-900 dark:text-white/65 dark:hover:text-white',
                                  isPathActive(pathname, item.href) &&
                                    'font-medium text-gray-900 dark:text-white'
                                )}
                                onClick={closeMobileMenu}
                                onKeyDown={(event) =>
                                  handleMenuKeyDown(group.id, itemIndex, event)
                                }
                              >
                                {item.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                <motion.div
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: (NAV_GROUPS.length + 1) * 0.06, ease: 'easeOut' }}
                >
                  <Link
                    href="/about"
                    onClick={closeMobileMenu}
                    aria-current={isPathActive(pathname, '/about') ? 'page' : undefined}
                    className={cn(
                      'block py-6 text-2xl font-medium transition-colors',
                      'text-gray-900 hover:text-gray-600 dark:text-white dark:hover:text-gray-400',
                      isPathActive(pathname, '/about') && 'font-semibold'
                    )}
                  >
                    About
                  </Link>
                </motion.div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
