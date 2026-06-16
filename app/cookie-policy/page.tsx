/**
 * Cookie Policy — uses Cookiebot's embedded cookie declaration.
 *
 * Cookiebot auto-generates the cookie list from its scanner and keeps it
 * updated as new cookies appear. We embed it via the official
 * CookieDeclaration script (cd.js), which renders the categorised table
 * (Necessary / Preferences / Statistics / Marketing) at the script's
 * position in the page.
 */
import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Cookie policy of Confair Consultancy BV — how we use cookies on confair.com.',
};

// Public Cookiebot group ID (data-cbid) — see app/layout.tsx.
const COOKIEBOT_CBID = '47f0ce2e-c2fa-4634-bf72-978741be7db6';

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
        <div className="max-w-4xl mx-auto px-6">
          {/* Cookiebot's cd.js injects the cookie declaration table at the
              position of its own <script> element, so we render it inside
              this content container. */}
          <Script
            id="CookieDeclaration"
            src={`https://consent.cookiebot.com/${COOKIEBOT_CBID}/cd.js`}
            type="text/javascript"
            strategy="afterInteractive"
          />
        </div>
      </section>
    </>
  );
}
