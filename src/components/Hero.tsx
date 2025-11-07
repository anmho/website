'use client';

import SectionContainer from './SectionContainer';
import { IoIosSchool } from 'react-icons/io';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  return (
    <SectionContainer>
      <div
        className="flex justify-between items-center text-left py-20 mt-20 flex-col h-fit"
        ref={ref}
        style={{
          transform: isInView ? 'none' : 'translateY(100px)',
          opacity: isInView ? 1 : 0,
          transition:
            'transform 1s cubic-bezier(.33,.2,0,.9), opacity 0.5s cubic-bezier(.59,.08,.58,1) 0.1s',
        }}
      >
        <div>
          <div className="mb-8 sm:mb-0">
            <h1 className="sm:text-9xl text-7xl flex-grow -tracking-wider leading-relaxed">
              Building scalable services
            </h1>
          </div>

          <div>
            <p
              className="text-md sm:text-xl 
          md:text-2xl
          text-gray-400 flex-grow 
          sm:leading-8 md:leading-10 -tracking-wide font-light
          sm:ml-4"
            >
              Hey, I'm Andrew Ho, a backend dev with a passion for high
              performance data intensive systems.
              <br></br>
            </p>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}

export default Hero;
