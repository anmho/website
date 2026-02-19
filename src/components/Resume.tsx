'use client';

// @ts-ignore
import { Document, Page } from 'react-pdf';

function Resume() {

  return (
    <div className="drop-shadow-xl hover:drop-shadow-2xl w-max hover:cursor-pointer transition-all duration-300 hover:-translate-y-3 bg-white z-50 mt-64">
      <a
        href="https://github.com/anmho/resume/blob/main/main.pdf"
        target="_blank"
      >
        <Document file="https://personalwebsiteserver.herokuapp.com/resume.pdf">
          <Page pageNumber={1} />
        </Document>
      </a>
    </div>
  );
}

export default Resume;
