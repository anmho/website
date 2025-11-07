'use client';

import About from '@/components/About';
import Experience from '@/components/Experience';
import Hero from '@/components/Hero';
import Navbar from '@/components/Navbar';
import Projects from '@/components/Projects';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Handle hash navigation on page load
    if (window.location.hash === '#about') {
      const attemptScroll = (attempts = 0) => {
        const aboutElement = document.getElementById('about');
        if (aboutElement) {
          const navbarHeight = 96; // h-24 = 96px
          const elementPosition =
            aboutElement.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - navbarHeight;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          });
        } else if (attempts < 20) {
          // Retry if element not found yet (up to 2 seconds)
          setTimeout(() => attemptScroll(attempts + 1), 100);
        }
      };
      // Wait a bit for page to render
      setTimeout(() => attemptScroll(), 300);
    }
  }, []);

  return (
    <main className="w-full overflow-hidden scroll-pt-36 snap-y dark:text-white text-gray-900">
      <Navbar />

      <div className="flex justify-center align-center flex-col  pt-20">
        <div className="flex justify-center align-center h-screen">
          <Hero />
        </div>
        <div className="flex justify-center align-center">
          <Experience />
        </div>
        <div className="flex justify-center align-center">
          <Projects projects={[]} />
        </div>
        <div className="flex justify-center align-center">
          <About />
        </div>
      </div>
    </main>
  );
}
