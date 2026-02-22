'use client';

import clsx from 'clsx';
import { useEffect, useState } from 'react';

type CopyCodeBlockProps = {
  code: string;
  className?: string;
};

function getLanguageLabel(className?: string): string | null {
  if (!className) {
    return null;
  }
  const match = className.match(/language-([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function CopyCodeBlock({ code, className }: CopyCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const language = getLanguageLabel(className);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-800">
        <span className="text-xs font-mono uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {language ?? 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={clsx(
            'rounded px-2 py-1 text-xs font-mono transition-colors',
            copied
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
          )}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4">
        <code className={clsx('text-sm font-mono text-gray-800 dark:text-gray-200', className)}>
          {code}
        </code>
      </pre>
    </div>
  );
}
