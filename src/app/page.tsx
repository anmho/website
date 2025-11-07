import Contact from '@/components/Contact';
import Experience from '@/components/Experience';
import Hero from '@/components/Hero';
import Navbar from '@/components/Navbar';
import Projects from '@/components/Projects';

export default function Home() {
  return (
    <main className="w-full overflow-hidden scroll-pt-36 snap-y text-white">
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
          <Contact />
        </div>
      </div>
    </main>
  );
}
