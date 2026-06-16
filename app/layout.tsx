import type { Metadata } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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
};

// Cookiebot Consent Management Platform identifier (data-cbid). This is
// a public, client-side group ID — identical across environments — so it
// lives in source rather than an env var.
const COOKIEBOT_CBID = '47f0ce2e-c2fa-4634-bf72-978741be7db6';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
      <body className="min-h-screen flex flex-col bg-white text-[#222c4a]">
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
