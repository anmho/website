# Migration from Vite to Next.js

This project has been successfully migrated from Vite + React to Next.js 14 with App Router.

## What Was Transferred (1:1)

### Components (All in `src/components/`)
- ✅ Hero.tsx - Hero section with animations
- ✅ Navbar.tsx - Navigation bar
- ✅ Experience.tsx - Experience timeline section
- ✅ Contact.tsx - Contact information section
- ✅ Projects.tsx - Projects grid section
- ✅ Skills.tsx - Skills display section
- ✅ Resume.tsx - Resume PDF viewer
- ✅ Playground.tsx - Playground section
- ✅ SectionContainer.tsx - Reusable section wrapper

### Pages
- ✅ Home page (src/app/page.tsx) - Main landing page with all sections
- ✅ Blog page (src/app/blog/page.tsx) - Blog page placeholder

### Assets
- ✅ All images from `src/assets/images/`
  - currentlyplaying.png
  - john-morgan-4eBOPIJliNc-unsplash.jpg
  - mysteamstats.png
  - personalwebsite.png
  - stocks.jpg
  - test.png
- ✅ JSON data files from `src/assets/static/json/`
  - projects.json
  - skills.json
- ✅ favicon.ico in `public/`

### Styles & Configuration
- ✅ Global CSS with Epilogue font import
- ✅ Tailwind CSS configuration with custom animations
- ✅ PostCSS configuration
- ✅ TypeScript configuration

### Models
- ✅ section.ts - Section enum

## Key Changes for Next.js

1. **'use client' Directive**: Added to components using:
   - React hooks (useState, useRef, useEffect)
   - Framer Motion hooks (useInView)
   - Browser APIs

2. **File Structure**:
   - Moved from `src/main.tsx` entry point to Next.js App Router (`src/app/`)
   - `App.tsx` content moved to `src/app/page.tsx`
   - Added `src/app/layout.tsx` for root layout and metadata

3. **Dependencies**: Updated to Next.js compatible versions
   - React 18.2.0
   - Next.js 14.0.0
   - All other dependencies maintained

4. **Build System**:
   - Changed from Vite to Next.js built-in bundler
   - Scripts updated: `dev`, `build`, `start`, `lint`

## No Functional Changes

- ✅ All animations preserved (Framer Motion)
- ✅ All styling preserved (Tailwind CSS)
- ✅ All component logic preserved
- ✅ All assets and data preserved
- ✅ Same user experience and appearance

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The site will be available at http://localhost:3000

