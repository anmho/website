'use client';

import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import type { PostType } from '@/components/PostEditor';
import { useEffect, useState } from 'react';

export default function OwnerEditorLink({ type, label }: { type: PostType; label: string }) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { authenticated?: boolean } | null) => {
        if (alive) setIsOwner(data?.authenticated === true);
      })
      .catch(() => {
        if (alive) setIsOwner(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  if (!isOwner) return null;

  return (
    <Link
      href={`/editor?type=${type}`}
      className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-xs font-mono text-gray-600 transition-colors hover:border-gray-500 hover:text-gray-950 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-white"
    >
      <FiPlus size={14} />
      {label}
    </Link>
  );
}
