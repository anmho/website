'use client';

import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { RxArrowTopRight } from 'react-icons/rx';
import Link from 'next/link';
import { experience } from '@/lib/experience';

export default function AboutPage() {
  const githubUrl = 'https://github.com/anmho';
  const linkedinUrl = 'https://linkedin.com/in/andrewmnho';
  const gmail = 'andyminhtuanho@gmail.com';

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
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

            <div className="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">
              <div className="text-lg sm:text-xl">
                <p className="mb-6">
                  Hey, I'm{' '}
                  <span className="text-gray-900 dark:text-white font-medium">
                    Andrew Ho
                  </span>
                  , a backend engineer with a passion for building
                  high-performance, data-intensive systems.
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

              <div className="pt-8 border-t border-gray-200 dark:border-gray-900">
                <h2 className="text-2xl sm:text-3xl font-medium mb-6 text-gray-900 dark:text-gray-100">
                  Experience
                </h2>
                <div className="space-y-6 text-base sm:text-lg">
                  {experience.map((item) => (
                    <div key={item.company} className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <span className="font-medium text-gray-900 dark:text-white">{item.company}</span>
                      <span className="text-left text-gray-500 dark:text-gray-400 sm:text-right">{item.period}</span>
                      <span className="text-gray-600 dark:text-gray-400">{item.role}</span>
                       <span className="text-left text-gray-600 dark:text-gray-400 sm:text-right">{item.location}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-gray-200 dark:border-gray-900">
                <h2 className="text-2xl sm:text-3xl font-medium mb-6 text-gray-900 dark:text-gray-100">
                  Connect
                </h2>
                <div className="space-y-4">
                  <AboutLink href={`mailto:${gmail}`} label={gmail} />
                  <AboutLink href={githubUrl} label="GitHub" external />
                  <AboutLink href={linkedinUrl} label="LinkedIn" external />
                </div>
              </div>

              <div className="pt-8 border-t border-gray-200 dark:border-gray-900">
                <Link
                  href="/articles"
                  className="text-lg sm:text-xl text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors inline-flex items-center group"
                >
                  <span>Read my articles</span>
                  <RxArrowTopRight
                    size={24}
                    className="font-extrabold group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                  />
                </Link>
              </div>
            </div>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}

function AboutLink({ href, label, external = false }: { href: string; label: string; external?: boolean }) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="flex items-center text-lg sm:text-xl text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-300 transition-colors group"
    >
      <span>{label}</span>
      <RxArrowTopRight
        size={24}
        className="font-extrabold group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
      />
    </a>
  );
}
