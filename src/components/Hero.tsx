'use client';

import NowPlayingCard from './NowPlayingCard';
import SectionContainer from './SectionContainer';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-20%' });

  return (
    <SectionContainer>
      <div className="relative w-full min-h-[calc(100vh-160px)] py-12 sm:py-16 flex items-center">
        <div ref={ref} className="w-full text-left space-y-6">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
            transition={{
              duration: 1,
              ease: [0.33, 0.2, 0, 0.9],
            }}
            className="space-y-6"
          >
            <h1 className="text-lg sm:text-xl font-normal tracking-normal leading-relaxed text-gray-900 dark:text-slate-100">
              hey - i'm andy.
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              a software engineer focused on applying ai to novel areas. currently
              ml infra @ snap
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 24, opacity: 0 }}
            transition={{
              delay: 0.38,
              duration: 0.72,
              ease: [0.33, 0.2, 0, 0.9],
            }}
          >
            <NowPlayingCard className="max-w-md" />
          </motion.div>
        </div>
      </div>
    </SectionContainer>
  );
}

export default Hero;
