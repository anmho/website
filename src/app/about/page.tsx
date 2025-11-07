'use client';

import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { RxArrowTopRight } from 'react-icons/rx';
import Link from 'next/link';

export default function About() {
  const githubUrl = 'https://github.com/anmho';
  const linkedinUrl = 'https://linkedin.com/in/andrewmnho';
  const gmail = 'andyminhtuanho@gmail.com';

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <main className="w-full overflow-hidden text-white">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div
            className="w-full text-left py-20 max-w-4xl mx-auto"
            ref={ref}
            style={{
              opacity: isInView ? 1 : 0,
              transition: `opacity 0.6s ease-out`,
            }}
          >
            <h1 className="sm:text-7xl text-5xl flex-grow -tracking-wider leading-relaxed mb-12">
              About
            </h1>

            <div className="space-y-8 text-gray-300 leading-relaxed">
              <div className="text-lg sm:text-xl">
                <p className="mb-6">
                  Hey, I'm{' '}
                  <span className="text-white font-medium">Andrew Ho</span>, a
                  backend engineer with a passion for building high-performance,
                  data-intensive systems.
                </p>
                <p className="mb-6">
                  I'm currently a Software Engineer at Snap Inc. in Los Angeles,
                  where I work on scalable backend infrastructure. Previously,
                  I've interned at companies like Amazon Web Services, Tesla,
                  and NASA, gaining experience across different domains of
                  software engineering.
                </p>
                <p className="mb-6">
                  I'm particularly interested in database optimization,
                  distributed systems, and building APIs that can handle
                  millions of requests. When I'm not coding, I enjoy writing
                  about what I learn and sharing insights on building resilient
                  systems.
                </p>
              </div>

              <div className="pt-8 border-t border-gray-900">
                <h2 className="text-2xl sm:text-3xl font-medium mb-6 text-gray-100">
                  Experience
                </h2>
                <div className="space-y-6 text-base sm:text-lg">
                  <div>
                    <div className="flex flex-row justify-between mb-1">
                      <span className="text-white font-medium">Snap Inc.</span>
                      <span className="text-gray-500">Full Time</span>
                    </div>
                    <div className="flex flex-row justify-between text-gray-400">
                      <span>Software Engineer</span>
                      <span>Los Angeles, CA</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-row justify-between mb-1">
                      <span className="text-white font-medium">
                        Amazon Web Services
                      </span>
                      <span className="text-gray-500">Summer 2025</span>
                    </div>
                    <div className="flex flex-row justify-between text-gray-400">
                      <span>Software Engineer Intern</span>
                      <span>New York, NY</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-row justify-between mb-1">
                      <span className="text-white font-medium">Tesla</span>
                      <span className="text-gray-500">Fall 2024</span>
                    </div>
                    <div className="flex flex-row justify-between text-gray-400">
                      <span>Software Engineer Intern</span>
                      <span>Los Angeles, CA</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-row justify-between mb-1">
                      <span className="text-white font-medium">NASA</span>
                      <span className="text-gray-500">Spring 2024</span>
                    </div>
                    <div className="flex flex-row justify-between text-gray-400">
                      <span>Lucy Researcher</span>
                      <span>Pasadena, CA</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-900">
                <h2 className="text-2xl sm:text-3xl font-medium mb-6 text-gray-100">
                  Connect
                </h2>
                <div className="space-y-4">
                  <a
                    href={`mailto:${gmail}`}
                    className="flex items-center text-lg sm:text-xl hover:text-gray-300 transition-colors group"
                  >
                    <span>{gmail}</span>
                    <div className="aspect-square p-1 flex items-center justify-center">
                      <RxArrowTopRight
                        size={24}
                        className="font-extrabold group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                      />
                    </div>
                  </a>
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-lg sm:text-xl hover:text-gray-300 transition-colors group"
                  >
                    <span>GitHub</span>
                    <div className="aspect-square p-1 flex items-center justify-center">
                      <RxArrowTopRight
                        size={24}
                        className="font-extrabold group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                      />
                    </div>
                  </a>
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-lg sm:text-xl hover:text-gray-300 transition-colors group"
                  >
                    <span>LinkedIn</span>
                    <div className="aspect-square p-1 flex items-center justify-center">
                      <RxArrowTopRight
                        size={24}
                        className="font-extrabold group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                      />
                    </div>
                  </a>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-900">
                <Link
                  href="/articles"
                  className="text-lg sm:text-xl text-gray-400 hover:text-gray-300 transition-colors inline-flex items-center group"
                >
                  <span>Read my articles</span>
                  <div className="aspect-square p-1 flex items-center justify-center">
                    <RxArrowTopRight
                      size={24}
                      className="font-extrabold group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                    />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}
