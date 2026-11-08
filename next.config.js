/** @type {import('next').NextConfig} */

// URLs from the previous site (and the confairaviation.com era) that Google,
// job boards and old e-mails still send visitors to. Every one of these
// answered 404 until 2026-11-08; Vercel Analytics showed /partners/air-atlanta-europe
// as the #2 landing page from Google and /jobs at ~90 visitors a quarter.
//
// `permanent: true` (308) where the new page IS the replacement; `false` (307)
// for the operator pages, which should become real pages of their own — a
// temporary redirect keeps that door open without Google transferring the
// URL's standing to the vacancy list for good.
const LEGACY_REDIRECTS = [
  // Operator ("partner") pages → the vacancy list filtered to that operator.
  { source: '/partners/air-atlanta-europe', destination: '/vacancies?q=Air%20Atlanta', permanent: false },
  { source: '/partners/air-atlanta-icelandic', destination: '/vacancies?q=Air%20Atlanta', permanent: false },
  { source: '/partners/air-arabia', destination: '/vacancies?q=Air%20Arabia', permanent: false },
  { source: '/partners/servitec', destination: '/vacancies?q=Servitec', permanent: false },
  { source: '/partners/:path*', destination: '/vacancies', permanent: false },
  { source: '/partners', destination: '/vacancies', permanent: false },
  { source: '/partner/:path*', destination: '/vacancies', permanent: false },

  // Old job URLs. Their slugs carry no id and do not match today's, so they
  // land on the list rather than guess at a posting.
  { source: '/jobs', destination: '/vacancies', permanent: true },
  { source: '/jobs/:path*', destination: '/vacancies', permanent: true },
  { source: '/openings', destination: '/vacancies', permanent: true },
  { source: '/recruitment', destination: '/vacancies', permanent: true },
  { source: '/for-professionals', destination: '/vacancies', permanent: true },

  { source: '/for-airlines', destination: '/industries/aviation', permanent: true },
  { source: '/hr-solutions', destination: '/services', permanent: true },
  { source: '/about-us', destination: '/about', permanent: true },
  { source: '/kontakt', destination: '/contact', permanent: true },
  { source: '/impressum', destination: '/contact', permanent: true },
  { source: '/impressum.html', destination: '/contact', permanent: true },

  { source: '/blog', destination: '/blog-posts', permanent: true },
  { source: '/blog/:path*', destination: '/blog-posts', permanent: true },
  { source: '/insights', destination: '/blog-posts', permanent: true },

  { source: '/sitemap_index.xml', destination: '/sitemap.xml', permanent: true },
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'sntcxllhlwnxxbrzcuxb.supabase.co' },
    ],
  },
  async redirects() {
    return [
      // One host. www.confair.com served every page a second time (200, no
      // canonical), so Google saw two copies of the site.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.confair.com' }],
        destination: 'https://confair.com/:path*',
        permanent: true,
      },
      ...LEGACY_REDIRECTS,
    ];
  },
};

module.exports = nextConfig;
