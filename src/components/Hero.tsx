'use client';

import SectionContainer from './SectionContainer';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-20%' });

  return (
    <SectionContainer>
      <div className="relative w-full min-h-[calc(100vh-160px)] py-12 sm:py-16 flex items-center">
        <motion.div
          ref={ref}
          initial={{ y: 100, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
          transition={{
            duration: 1,
            ease: [0.33, 0.2, 0, 0.9],
          }}
          className="w-full text-left space-y-6"
        >
          <h1 className="text-lg sm:text-xl font-normal tracking-normal leading-relaxed text-slate-100">
            hey - i'm andy.
          </h1>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
            a software engineer focused on applying ai to novel areas. currenly
            ml infra @ snap
          </p>
        </motion.div>
      </div>
    </SectionContainer>
  );
}

export default Hero;
