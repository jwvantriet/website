/**
 * Cookie Policy — uses Cookiebot's embedded cookie declaration.
 *
 * Cookiebot auto-generates the cookie list from its scanner and keeps it
 * updated as new cookies appear. The declaration is rendered inline by
 * the CookieDeclaration client component, which injects Cookiebot's cd.js
 * into the page content (see that component for why next/script can't be
 * used here — it would render the table below the footer).
 */
import type { Metadata } from 'next';
import CookieDeclaration from '@/components/CookieDeclaration';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Cookie policy of Confair Consultancy BV — how we use cookies on confair.com.',
};

export default function CookiePolicyPage() {
  return (
    <>
      <section className="bg-[#222c4a] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">Legal</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">Cookie Policy</h1>
          <p className="text-white/70 text-base max-w-2xl mx-auto">
            How Confair Group uses cookies and similar technologies on confair.com.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 prose prose-slate max-w-none">
          <CookieDeclaration />
        </div>
      </section>
    </>
  );
}
