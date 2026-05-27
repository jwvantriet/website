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

// Termly UUID is configured per-environment on Vercel. When unset
// (local dev / forks) the banner script is skipped — fail-quiet.
const TERMLY_UUID = process.env.NEXT_PUBLIC_TERMLY_WEBSITE_UUID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/*
        Termly Consent Management Platform.
        The single embedded script loads their CDN-served banner + cookie
        scanner. Scanner crawls confair.com on a schedule, categorises
        every detected cookie (Necessary / Preferences / Analytics /
        Marketing) and feeds the consent state into a global Termly.*
        object. Any third-party tracker we add later (Vercel Analytics,
        ad pixels, etc.) gets caught automatically because autoBlock=on
        defers their <script> tags until consent is granted.
      */}
      {TERMLY_UUID && (
        <Script
          id="termly-consent"
          src={`https://app.termly.io/resource-blocker/${TERMLY_UUID}?autoBlock=on`}
          strategy="beforeInteractive"
        />
      )}
      <body className="min-h-screen flex flex-col bg-white text-[#222c4a]">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        {/* Vercel Analytics — first-party page-view + visitor counts.
            Cookieless by default; Termly's autoBlock will gate it once
            the Analytics consent category is mapped.
            Speed Insights — Core Web Vitals + RUM. Same cookieless model. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
