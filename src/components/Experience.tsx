'use client';

// interface ContactProps P
import Resume from './Resume';
import SectionContainer from './SectionContainer';
import { FiExternalLink } from 'react-icons/fi';
import { BsGithub } from 'react-icons/bs';
import { BsLinkedin } from 'react-icons/bs';
import { SiGmail } from 'react-icons/si';
import { useRef } from 'react';
import { useInView } from 'framer-motion';

/* Import as json */
const experiences: IExperience[] = [
  {
    company: 'Snap Inc.',
    year: 'Full Time',
    title: 'Software Engineer',
    location: 'Los Angeles, CA',
  },
  {
    company: 'Amazon Web Services',
    year: 'Summer 2025',
    title: 'Engineering',
    location: 'New York, NY',
  },
  {
    company: 'Tesla',
    year: 'Fall 2024',
    title: 'Engineering',
    location: 'Los Angeles, CA',
  },
  {
    company: 'Snap Inc.',
    year: 'Summer 2024',
    title: 'Engineering',
    location: 'Los Angeles, CA',
  },
  {
    company: 'NASA',
    year: 'Spring 2024',
    title: 'Lucy Researcher',
    location: 'Pasadena, CA',
  },
  {
    company: 'Snap Inc.',
    year: 'Spring 2023',
    title: 'Engineering',
    location: 'Los Angeles, CA',
  },
  {
    company: 'University of California, Irvine',
    year: '2022 - 2024',
    title: 'Web Developer',
    location: 'Irvine, CA',
  },

  {
    company: 'Snap Inc.',
    year: 'Summer 2022',
    title: 'Engineering Scholar',
    location: 'Los Angeles, CA',
  },
];

function Experience() {
  const githubUrl = 'github.com/anmho';
  const linkedinUrl = 'linkedin.com/in/andrewmnho';
  const gmail = 'andyminhtuanho@gmail.com';

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <SectionContainer
      id="about"
      className="mb-24 sm:mb-40 py-16 sm:py-20"
      style={{
        transform: isInView ? 'none' : 'translateY(100px)',
        opacity: isInView ? 1 : 0,
        transition:
          'transform 1s cubic-bezier(.33,.2,0,.9), opacity 0.5s cubic-bezier(.59,.08,.58,1)',
      }}
    >
      <div
        className="flex w-full flex-col justify-between gap-10 text-left md:flex-row md:items-start"
        ref={ref}
      >
        <div className="md:w-1/2 text-left md:pr-8">
          <h1 className="mb-6 text-4xl sm:text-5xl lg:text-7xl">Experience</h1>
        </div>

        <div className="md:w-1/2 flex flex-col p-2 font-light">
          {experiences.map((exp, index) => (
            <ExperienceItem
              experience={exp}
              index={index}
              key={`${exp.company}-${exp.year}-${index}`}
            />
          ))}
        </div>
      </div>
    </SectionContainer>
  );
}

interface IExperience {
  company: string;
  year: string;
  title: string;
  location: string;
}

interface ExperienceItemProps {
  experience: IExperience;
  index: number;
}

function ExperienceItem({ experience, index }: ExperienceItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const itemInView = useInView(itemRef, { once: true, margin: '-80px' });

  return (
    <div
      ref={itemRef}
      className="mb-10 w-full text-base sm:mb-16 sm:text-xl"
      style={{
        opacity: itemInView ? 1 : 0,
        transform: itemInView ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease-out ${
          index * 0.06
        }s, transform 0.6s ease-out ${index * 0.06}s`,
      }}
    >
      <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">
          {experience.company}
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-300 sm:text-base">
          {experience.year}
        </p>
      </div>
      <div className="mt-2 flex w-full flex-col gap-1 text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:text-base">
        <span>{experience.title}</span>
        <span>{experience.location}</span>
      </div>
    </div>
  );
}

export default Experience;
