'use client';

import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import { Project } from '@/components/Projects';
import projectsData from '@/assets/static/json/projects.json';
import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { FiGithub, FiExternalLink } from 'react-icons/fi';
import { BsAsterisk } from 'react-icons/bs';

export default function ProjectsPage() {
  const projects = projectsData as Project[];

  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <div className="w-full text-left py-20">
            <AnimatedTitle>
              <h1 className="sm:text-7xl text-5xl flex-grow -tracking-wider leading-relaxed mb-8">
                Projects
              </h1>
            </AnimatedTitle>
            <p className="text-md sm:text-xl text-gray-600 dark:text-gray-400 -tracking-wide font-light sm:ml-4 mb-16">
              A collection of projects showcasing my work in building scalable
              systems and applications.
            </p>

            <div className="space-y-16">
              {projects.map((project, index) => (
                <ProjectDetailCard
                  key={index}
                  project={project}
                  index={index}
                />
              ))}
            </div>
          </div>
        </SectionContainer>
      </div>
    </main>
  );
}

function ProjectDetailCard({
  project,
  index,
}: {
  project: Project;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <div
      ref={ref}
      className="border-b border-gray-200 dark:border-gray-800 pb-16 last:border-b-0"
      style={{
        transform: isInView ? 'none' : 'translateY(50px)',
        opacity: isInView ? 1 : 0,
        transition: `transform 0.8s cubic-bezier(.33,.2,0,.9) ${
          index * 0.1
        }s, opacity 0.6s cubic-bezier(.59,.08,.58,1) ${index * 0.1}s`,
      }}
    >
      <div className="flex flex-col md:flex-row gap-8 md:gap-12">
        {/* Image */}
        <div className="md:w-1/3 flex-shrink-0">
          <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
            <img
              src={project.imageSrc}
              alt={project.title}
              className="object-cover h-full w-full hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-3xl md:text-4xl font-medium -tracking-wide text-gray-900 dark:text-white">
                {project.title}
              </h2>
              <span className="text-gray-500 dark:text-gray-400 text-lg ml-4 flex-shrink-0">
                {project.year}
              </span>
            </div>

            <p className="text-gray-600 dark:text-gray-400 text-lg mb-6 leading-relaxed">
              {project.desc}
            </p>

            {/* Skills Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {project.skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full border text-sm text-center bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800"
                >
                  {skill}
                </span>
              ))}
            </div>

            {/* Blurb */}
            {project.blurb && project.blurb.length > 0 && (
              <div className="flex flex-row items-center mb-6 text-gray-600 dark:text-gray-400">
                {project.blurb.map((str: string, i: number) => (
                  <div key={i} className="flex items-center">
                    {i > 0 && (
                      <BsAsterisk
                        size={12}
                        className="mx-2 text-gray-400 dark:text-gray-500"
                      />
                    )}
                    <span className="text-sm font-light text-gray-600 dark:text-gray-400">
                      {str}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-6 mt-4">
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors group"
              >
                <FiGithub size={18} />
                <span className="relative after:bg-sky-600 dark:after:bg-sky-400 after:w-0 after:group-hover:w-full after:h-0.5 after:absolute after:left-0 after:bottom-0 after:transition-all after:duration-200">
                  View Code
                </span>
              </a>
            )}
            {project.websiteUrl && (
              <a
                href={project.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors group"
              >
                <FiExternalLink size={18} />
                <span className="relative after:bg-sky-600 dark:after:bg-sky-400 after:w-0 after:group-hover:w-full after:h-0.5 after:absolute after:left-0 after:bottom-0 after:transition-all after:duration-200">
                  Live Demo
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
