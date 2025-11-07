'use client';

import personalWebsiteImage from '../assets/images/personalwebsite.png';
import steamStatsImage from '../assets/images/mysteamstats.png';
import currentlyPlayingImage from '../assets/images/currentlyplaying.png';
import SectionContainer from './SectionContainer';
// import stocks from "../assets/images/nick-chong-N__BnvQ_w18-unsplash.jpg";
import { motion, useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { FiArrowUpRight } from 'react-icons/fi';
import { BsAsterisk } from 'react-icons/bs';

interface ProjectsProps extends React.ComponentPropsWithRef<'div'> {
  projects: Project[];
}

const a = {
  title: 'Pong Online',
  year: '2022',
  desc: 'An online multi-player pong game.',
  areas: ['React', 'Websockets'],
  skills: ['React', 'TypeScript', 'Flask', 'Socket.IO'],
  repoUrl: '',
  websiteUrl: '',
  imageSrc: '',
};

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
        {projects.map((p, i) => (
          <ProjectCard project={p} key={i} />
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
        <img src={project.imageSrc} className="object-cover h-full w-full" />

        {/* Overlay */}
        <Overlay project={project} />
      </div>

      <div className="py-5 text-left text-xl">
        <h3 className="font-medium">{project?.title}</h3>
        <div className="flex flex-row align-center h-8 sm:text-lg">
          {/* <div className="flex flex-row align-center justify-center"> */}
          {project.blurb.map((str: string, i: number) => (
            <>
              {i > 0 && (
                <div className="flex justify-center align-center flex-col text-gray-400 mx-2 pb-1">
                  {<BsAsterisk size={13} />}
                </div>
              )}
              <div className="flex flex-col justify-center align-center">
                <p className="tracking-tight text-gray-400  font-light leading-none">
                  {str}
                </p>
              </div>
            </>
          ))}
          {/* </div> */}

          {/* Web Design * Branding */}
        </div>
      </div>
    </div>
  );
}

function Overlay({ project }: ProjectCardProps) {
  const desc = (
    <>
      {/* Title and Year */}
      <div className="flex flex-row justify-between align-center mb-4">
        <h3 className="text-3xl">{project.title}</h3>
        <h3 className="text-xl text-gray-200">{project.year}</h3>
      </div>

      {/* Description */}
      {/* <div className="mb-4">
    <p className="text-md text-gray-400">{project.desc}</p>
  </div> */}

      {/* Skills */}
      <div className="mb-2 flex flex-row text-gray-300">
        <p className="text-md mr-1 font-semibold">Skills: </p>
        <p className="text-md">{project.skills.join(', ')}</p>
      </div>

      {/* <div className="hover:translate-y-10 absolute w-5 h-5 bg-red-500 bottom-0 right-5"></div>

  <div className="group-hover:-translate-y-10 absolute w-5 h-5 bg-red-500 bottom-0 right-12 transition-all"></div> */}

      {/* Git Repo and Live Website */}
      <div className="flex flex-row align-center text-lg text-sky-500">
        <a href={project.repoUrl} className="mr-5 group/item">
          <p className="after:bg-sky-500 relative after:w-0 after:group-hover/item:w-full after:group-hover/item:right-0 after:h-0.5 after:absolute after:left-0 after:bottom-0 after:transition-all after:duration-200">
            Git Repository
          </p>
        </a>
        <a href={project.websiteUrl} className="ml-5 group/item">
          <p className="after:bg-sky-500 after:w-0 relative after:group-hover/item:w-full after:group-hover/item:right-0 after:h-0.5 after:absolute after:left-0 after:bottom-0 after:transition-all after:duration-200">
            Live Website
          </p>
        </a>
      </div>
    </>
  );

  return (
    <div className="flex flex-col justify-center align-center text-left mb-10 w-full absolute top-0 left-0 opacity-0 group-hover:opacity-100 group-hover:bg-black/60  p-10 h-full  duration-300 transition-all hover:cursor-pointer"></div>
  );
}

export default Projects;
