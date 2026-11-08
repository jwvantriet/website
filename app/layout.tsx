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
import DomGuardReporter from '@/components/DomGuardReporter';
import { DOM_GUARD_SCRIPT } from '@/lib/dom-guard';
import JsonLd from '@/components/JsonLd';
import { organizationSchema } from '@/lib/structured-data';
import { DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    default: 'Confair Group — Contracting Solutions for Aviation, Maritime & Offshore',
    template: '%s | Confair Group',
  },
  description:
    'Certified contracting and workforce solutions for safety-critical industries: aviation, maritime, and offshore energy. Global deployment, full regulatory compliance.',
  // Falls back to the production host so canonical and og:image URLs are
  // absolute even where NEXT_PUBLIC_SITE_URL is unset (previews, local).
  metadataBase: new URL(SITE_URL),
  // Pages override this with their own via pageMetadata() (lib/seo.ts); it is
  // the fallback for the few routes that do not (404, apply flow).
  openGraph: {
    title: 'Confair Group',
    description:
      'Contracting solutions for aviation, maritime, and offshore operations.',
    siteName: 'Confair Group',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', images: [DEFAULT_OG_IMAGE.url] },
  // Google Search Console ownership verification. Paste the token from
  // GSC → "HTML tag" method into the GOOGLE_SITE_VERIFICATION env (Vercel →
  // Settings → Environment Variables) and redeploy; Next renders the
  // <meta name="google-site-verification"> tag. Left undefined = no tag.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  // iOS Safari turns phone numbers, e-mail addresses and street addresses in
  // the page into its own links, changing the DOM before React hydrates it.
  // React then finds a page it did not render and re-renders it, and that can
  // fail outright ("The object can not be found here.", iPhone Safari, on
  // /vacancies and /industries on 2026-11-02). The numbers and addresses that
  // should be tappable are real tel:/mailto: links in our own markup instead.
  formatDetection: { telephone: false, email: false, address: false },
};

// Cookiebot Consent Management Platform identifier (data-cbid). This is
// a public, client-side group ID — identical across environments — so it
// lives in source rather than an env var.
const COOKIEBOT_CBID = '47f0ce2e-c2fa-4634-bf72-978741be7db6';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        {/* Before React loads: a page changed by translation or an extension
            must not crash it (lib/dom-guard.ts). */}
        <script dangerouslySetInnerHTML={{ __html: DOM_GUARD_SCRIPT }} />
      </head>
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
        <DomGuardReporter />
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
