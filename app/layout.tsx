import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

// Brand webfonts. The shared preset (tailwind.confair-preset.js) declares
// Inter (body) + Poppins (headings) but leaves loading to the app; without
// this the site silently falls back to system-ui. next/font self-hosts the
// files (no external request at runtime) and exposes them as CSS variables
// that tailwind.config maps onto font-sans / font-heading.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttributionTracker from '@/components/AttributionTracker';
import JsonLd from '@/components/JsonLd';
import { organizationSchema } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: {
    default: 'Confair Group — Contracting Solutions for Aviation, Maritime & Offshore',
    template: '%s | Confair Group',
  },
  description:
    'Certified contracting and workforce solutions for safety-critical industries: aviation, maritime, and offshore energy. Global deployment, full regulatory compliance.',
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  openGraph: {
    title: 'Confair Group',
    description:
      'Contracting solutions for aviation, maritime, and offshore operations.',
    type: 'website',
  },
  // Google Search Console ownership verification. Paste the token from
  // GSC → "HTML tag" method into the GOOGLE_SITE_VERIFICATION env (Vercel →
  // Settings → Environment Variables) and redeploy; Next renders the
  // <meta name="google-site-verification"> tag. Left undefined = no tag.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

// Cookiebot Consent Management Platform identifier (data-cbid). This is
// a public, client-side group ID — identical across environments — so it
// lives in source rather than an env var.
const COOKIEBOT_CBID = '47f0ce2e-c2fa-4634-bf72-978741be7db6';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      {/*
        Cookiebot Consent Management Platform.
        Loaded as the first script in <head> with strategy
        "beforeInteractive" so it parses before any other resource. With
        data-blockingmode="auto", Cookiebot scans the page and defers every
        third-party <script>/cookie (Vercel Analytics, ad pixels, etc.)
        until the visitor grants the matching consent category
        (Necessary / Preferences / Statistics / Marketing). It also renders
        the consent banner and exposes the global `Cookiebot` object used by
        the Cookie Preferences button to re-open the dialog.
      */}
      <Script
        id="Cookiebot"
        src="https://consent.cookiebot.com/uc.js"
        data-cbid={COOKIEBOT_CBID}
        data-blockingmode="auto"
        type="text/javascript"
        strategy="beforeInteractive"
      />
      <body className="min-h-screen flex flex-col bg-white text-navy">
        <JsonLd data={organizationSchema()} />
        <AttributionTracker />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        {/* Vercel Analytics — first-party page-view + visitor counts.
            Cookieless by default; Cookiebot's auto-blocking will gate it
            once the Statistics consent category is mapped.
            Speed Insights — Core Web Vitals + RUM. Same cookieless model. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
