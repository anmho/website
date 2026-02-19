'use client';

import SectionContainer from './SectionContainer';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { BsAsterisk } from 'react-icons/bs';

interface ProjectsProps extends React.ComponentPropsWithRef<'div'> {
  projects: Project[];
}

function Projects({ projects, ...rest }: ProjectsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <SectionContainer
      id="projects"
      className="mb-64"
      {...rest}
      style={{
        transform: isInView ? 'none' : 'translateY(100px)',
        opacity: isInView ? 1 : 0,
        //cubic-bezier(.12,.8,.16,.99)
        transition:
          'transform 1s cubic-bezier(.33,.2,0,.9) 0.1s, opacity 0.5s cubic-bezier(.59,.08,.58,1) 0.3s',
      }}
    >
      <div className="grid sm:grid-cols-2 gap-x-6 w-full" ref={ref}>
        {projects.map((p) => (
          <ProjectCard project={p} key={p.title} />
        ))}
      </div>
    </SectionContainer>
  );
}

export type Project = {
  title: string;
  year: string;
  desc: string;
  skills: string[];
  repoUrl: string;
  websiteUrl: string;
  imageSrc: string;
  blurb: string[];
};

interface ProjectCardProps {
  project: Project;
}

function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="flex flex-col w-full">
      <div className="aspect-square rounded-xl bg-gray-500 overflow-hidden relative group">
        <img
          src={project.imageSrc}
          alt={project.title}
          className="object-cover h-full w-full"
        />

        {/* Overlay */}
        <Overlay project={project} />
      </div>

      <div className="py-5 text-left text-xl">
        <h3 className="font-medium">{project?.title}</h3>
        <div className="flex flex-row align-center h-8 sm:text-lg">
          {project.blurb.map((str: string, i: number) => (
            <div key={str} className="flex items-center">
              {i > 0 && (
                <div className="flex justify-center align-center flex-col text-gray-400 mx-2 pb-1">
                  <BsAsterisk size={13} />
                </div>
              )}
              <div className="flex flex-col justify-center align-center">
                <p className="tracking-tight text-gray-400 font-light leading-none">
                  {str}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Overlay({ project }: ProjectCardProps) {
  return (
    <div className="flex flex-col justify-center text-left w-full absolute top-0 left-0 opacity-0 group-hover:opacity-100 group-hover:bg-black/60 p-10 h-full duration-300 transition-all hover:cursor-pointer">
      <div className="flex flex-row justify-between items-center mb-4">
        <h3 className="text-3xl">{project.title}</h3>
        <h3 className="text-xl text-gray-200">{project.year}</h3>
      </div>

      <div className="mb-2 flex flex-row text-gray-300">
        <p className="text-md mr-1 font-semibold">Skills: </p>
        <p className="text-md">{project.skills.join(', ')}</p>
      </div>

      <div className="flex flex-row items-center text-lg text-sky-500">
        {project.repoUrl && (
          <a href={project.repoUrl} className="mr-5 group/item">
            <p className="after:bg-sky-500 relative after:w-0 after:group-hover/item:w-full after:group-hover/item:right-0 after:h-0.5 after:absolute after:left-0 after:bottom-0 after:transition-all after:duration-200">
              Git Repository
            </p>
          </a>
        )}
        {project.websiteUrl && (
          <a href={project.websiteUrl} className="ml-5 group/item">
            <p className="after:bg-sky-500 after:w-0 relative after:group-hover/item:w-full after:group-hover/item:right-0 after:h-0.5 after:absolute after:left-0 after:bottom-0 after:transition-all after:duration-200">
              Live Website
            </p>
          </a>
        )}
      </div>
    </div>
  );
}

export default Projects;
