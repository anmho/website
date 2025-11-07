# Directory Structure Comparison

## Original (Vite) Structure
```
personalwebsite/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Main app component
│   ├── index.css                   # Global styles
│   ├── components/
│   │   ├── Contact.tsx
│   │   ├── Experience.tsx
│   │   ├── Hero.tsx
│   │   ├── Navbar.tsx
│   │   ├── Playground.tsx
│   │   ├── Projects.tsx
│   │   ├── Resume.tsx
│   │   ├── SectionContainer.tsx
│   │   └── Skills.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   └── Blog.tsx
│   ├── models/
│   │   └── section.ts
│   └── assets/
│       ├── images/
│       └── static/json/
├── public/
│   └── favicon.ico
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json
```

## New (Next.js) Structure
```
website/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (replaces main.tsx)
│   │   ├── page.tsx                # Home page (replaces App.tsx + Home.tsx)
│   │   ├── globals.css             # Global styles (replaces index.css)
│   │   └── blog/
│   │       └── page.tsx            # Blog page
│   ├── components/                 # Same structure
│   │   ├── Contact.tsx
│   │   ├── Experience.tsx
│   │   ├── Hero.tsx
│   │   ├── Navbar.tsx
│   │   ├── Playground.tsx
│   │   ├── Projects.tsx
│   │   ├── Resume.tsx
│   │   ├── SectionContainer.tsx
│   │   └── Skills.tsx
│   ├── models/                     # Same structure
│   │   └── section.ts
│   └── assets/                     # Same structure
│       ├── images/
│       └── static/json/
├── public/
│   └── favicon.ico
├── next.config.js                  # Replaces vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json
```

## Key Mapping

| Original Vite | New Next.js | Purpose |
|--------------|-------------|---------|
| `src/main.tsx` | `src/app/layout.tsx` | Application entry & root layout |
| `src/App.tsx` | `src/app/page.tsx` | Home page content |
| `src/pages/Home.tsx` | `src/app/page.tsx` | Home page (merged with App.tsx) |
| `src/pages/Blog.tsx` | `src/app/blog/page.tsx` | Blog page |
| `src/index.css` | `src/app/globals.css` | Global styles |
| `vite.config.ts` | `next.config.js` | Build configuration |
| `index.html` | `src/app/layout.tsx` | HTML structure & metadata |

## Routing Changes

### Vite (Client-side routing would need react-router)
- Home: Would need react-router setup
- Blog: Would need react-router setup

### Next.js (File-based routing - built-in)
- Home: `/` → `src/app/page.tsx`
- Blog: `/blog` → `src/app/blog/page.tsx`

## No Changes Required
✅ All components remain identical
✅ All assets remain in same structure
✅ Tailwind and PostCSS configs unchanged
✅ TypeScript config minimal changes (Next.js specific only)

