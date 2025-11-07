'use client';

import Link from 'next/link';
import { BsAsterisk } from 'react-icons/bs';

function Navbar() {
  return (
    <div className="w-full fixed top-0 left-0 h-24 flex justify-between align-center backdrop-blur bg-black/50 z-50">
      <Link
        href="/"
        className="h-full flex justify-center align-center flex-col p-10 cursor-pointer group"
      >
        <BsAsterisk
          size={20}
          className="group-hover:rotate-12 transition-transform duration-200"
        />
      </Link>

      <div className="h-full flex justify-center align-center flex-row pr-10">
        <Link
          href="/articles"
          className="h-full flex justify-center align-center flex-col py-10 px-3 hover:text-gray-400 transition-colors cursor-pointer"
        >
          Articles
        </Link>
        <Link
          href="/notes"
          className="h-full flex justify-center align-center flex-col py-10 px-3 hover:text-gray-400 transition-colors cursor-pointer"
        >
          Notes
        </Link>
        <Link
          href="/projects"
          className="h-full flex justify-center align-center flex-col py-10 px-3 hover:text-gray-400 transition-colors cursor-pointer"
        >
          Projects
        </Link>
        <Link
          href="/about"
          className="h-full flex justify-center align-center flex-col py-10 px-3 hover:text-gray-400 transition-colors cursor-pointer"
        >
          About
        </Link>
      </div>
    </div>
  );
}

export default Navbar;
