'use client';

import dynamic from 'next/dynamic';
import NowPlayingCard from './NowPlayingCard';
import SectionContainer from './SectionContainer';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const ParticleSphere = dynamic(() => import('./ParticleSphere'), { ssr: false });

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-20%' });

  return (
    <SectionContainer>
      <div className="relative w-full min-h-[calc(100vh-160px)] flex items-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <div className="w-[min(80vw,600px)] aspect-square opacity-60 dark:opacity-80">
            <ParticleSphere />
          </div>
        </div>

        <motion.div
          ref={ref}
          initial={{ y: 100, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
          transition={{
            duration: 1,
            ease: [0.33, 0.2, 0, 0.9],
          }}
          className="relative z-10 w-full max-w-2xl text-left space-y-6 py-12 sm:py-16"
        >
          <h1 className="text-lg sm:text-xl font-normal tracking-normal leading-relaxed text-gray-900 dark:text-slate-100">
            hey - i'm andy.
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            a software engineer focused on applying ai to novel areas. currently
            building pragmatic systems and working on ml infra @ snap.
          </p>

          <NowPlayingCard className="max-w-md" />
        </motion.div>
      </div>
    </SectionContainer>
  );
}

export default Hero;
