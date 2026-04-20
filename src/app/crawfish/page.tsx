import Navbar from '@/components/Navbar';
import SectionContainer from '@/components/SectionContainer';
import AnimatedTitle from '@/components/AnimatedTitle';
import { FiExternalLink, FiMapPin } from 'react-icons/fi';

const LAST_UPDATED = 'April 2026';

const RESTAURANTS = [
  {
    name: 'Claw Shack Cajun Seafood',
    city: 'San Jose',
    vibe: 'Cozy East Side staple with classic garlic-butter-and-spice boil energy.',
    mustTry: 'Shambalang crawfish',
    links: [
      { label: 'Official site', href: 'https://www.clawshack.com/' },
      { label: 'Menu', href: 'https://www.clawshack.com/menu' },
      {
        label: 'Map',
        href: 'https://www.google.com/maps/search/?api=1&query=1696+Berryessa+Rd+San+Jose+CA+95133',
      },
    ],
  },
  {
    name: "The Kickin' Crab (San Jose II)",
    city: 'San Jose',
    vibe: 'Big-group friendly seafood boil spot with lots of seasoning options.',
    mustTry: "Crawfish (seasonal) + Kickin' Style sauce",
    links: [
      { label: 'Location page', href: 'https://thekickincrab.com/san-jose-2' },
      { label: 'All locations', href: 'https://thekickincrab.com/location' },
      {
        label: 'Map',
        href: 'https://www.google.com/maps/search/?api=1&query=1735+E+Capitol+Expy+San+Jose+CA+95121',
      },
    ],
  },
  {
    name: "Cajun Crack'n (Milpitas)",
    city: 'Milpitas',
    vibe: 'Reliable South Bay boil pick when you want crawfish and combo platters.',
    mustTry: 'Build-your-own boil with crawfish + shrimp combo',
    links: [
      { label: 'Milpitas menu', href: 'https://cajuncracknca.com/milpitas' },
      { label: 'Locations', href: 'https://cajuncracknca.com/locations' },
      {
        label: 'Map',
        href: 'https://www.google.com/maps/search/?api=1&query=275+Ranch+Dr+Milpitas+CA+95035',
      },
    ],
  },
  {
    name: 'Crawfish Bros',
    city: 'San Jose',
    vibe: 'New-school crawfish concept focused on fresh supply and Cajun-style boils.',
    mustTry: 'House boil with crawfish and crab',
    links: [
      { label: 'Official site', href: 'https://crawfishbros.com/' },
      { label: 'What they offer', href: 'https://crawfishbros.com/what-we-offer' },
    ],
  },
];

export default function CrawfishPage() {
  return (
    <main className="w-full overflow-hidden text-gray-900 dark:text-white">
      <Navbar />

      <div className="flex justify-center align-center flex-col pt-32">
        <SectionContainer>
          <section className="w-full py-20 text-left">
            <AnimatedTitle>
              <h1 className="sm:text-7xl text-5xl -tracking-wider leading-relaxed mb-6">
                South Bay Crawfish
              </h1>
            </AnimatedTitle>

            <p className="text-md sm:text-xl text-gray-600 dark:text-gray-400 -tracking-wide font-light sm:ml-4 mb-4 max-w-4xl">
              My favorite crawfish-heavy spots in and around the South Bay, with direct links so
              you can check menus and plan your next seafood boil night.
            </p>

            <div className="sm:ml-4 mb-12 inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Updated {LAST_UPDATED}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {RESTAURANTS.map((restaurant) => (
                <article
                  key={restaurant.name}
                  className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-white/[0.06] dark:to-white/[0.01] p-6 sm:p-7 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                >
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <h2 className="text-2xl font-semibold tracking-tight">{restaurant.name}</h2>
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1">
                      <FiMapPin size={12} />
                      {restaurant.city}
                    </span>
                  </div>

                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
                    {restaurant.vibe}
                  </p>

                  <div className="mb-6">
                    <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
                      Must try
                    </p>
                    <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">
                      {restaurant.mustTry}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {restaurant.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:border-gray-500 dark:hover:border-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {link.label}
                        <FiExternalLink size={13} />
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </SectionContainer>
      </div>
    </main>
  );
}
