'use client';

import { useEffect, useId, useRef, useState } from 'react';

type MermaidProps = {
  chart: string;
};

let mermaidInitialized = false;

export default function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/[:]/g, '-');
  const [error, setError] = useState<string | null>(null);
  const isDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default',
            securityLevel: 'strict',
            fontFamily: 'inherit',
          });
          mermaidInitialized = true;
        }
        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, id, isDark]);

  if (error) {
    return (
      <pre className="mb-6 overflow-x-auto rounded-lg border border-red-300 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        Failed to render diagram: {error}
      </pre>
    );
  }

  return (
    <div className="mb-8 flex justify-center overflow-x-auto rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
      <div ref={containerRef} />
    </div>
  );
}
