'use client';

import SectionContainer from './SectionContainer';
import { useRef } from 'react';
import { useInView } from 'framer-motion';

function Playground() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  return (
    <SectionContainer
      id="about"
      className="mb-40"
      style={{
        transform: isInView ? 'none' : 'translateY(100px)',
        opacity: isInView ? 1 : 0,
        transition:
          'transform 1s cubic-bezier(.33,.2,0,.9), opacity 0.5s cubic-bezier(.59,.08,.58,1)',
      }}
    >
      <div
        className="flex justify-between align-center w-full text-left md:flex-row flex-col "
        ref={ref}
      >
        <div className="w-1/2 text-left h-full">
          <h1 className="text-5xl lg:text-7xl mb-8 sticky ">Playground</h1>
        </div>

        <div className="md:w-1/2 flex flex-col p-2 font-light">
          <h3>Check out some of my experiments here!</h3>
        </div>
      </div>
    </SectionContainer>
  );
}

export default Playground;
