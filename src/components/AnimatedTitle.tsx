'use client';

import { useRef } from 'react';
import { useInView } from 'framer-motion';

interface AnimatedTitleProps {
  children: React.ReactNode;
  className?: string;
}

export default function AnimatedTitle({ children, className = '' }: AnimatedTitleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div
      ref={ref}
      style={{
        opacity: isInView ? 1 : 0,
        transition: 'opacity 0.6s ease-out',
      }}
      className={className}
    >
      {children}
    </div>
  );
}

