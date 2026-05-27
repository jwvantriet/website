/**
 * Cookie Policy — uses Termly's embedded policy block.
 *
 * Termly auto-generates the cookie list from their scanner and keeps
 * it updated as new cookies appear. We embed the policy via the
 * `name="termly-embed"` div + their embedder.min.js script — same
 * shape Termly uses on every customer's policy page.
 *
 * If the UUID env var isn't configured (local dev / forks) we render
 * a stub paragraph instead of a broken embed.
 */
import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Cookie policy of Confair Consultancy BV — how we use cookies on confair.com.',
};

const TERMLY_UUID = process.env.NEXT_PUBLIC_TERMLY_WEBSITE_UUID;

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
          {TERMLY_UUID ? (
            <>
              {/* Termly's embedder.min.js looks for divs with name="termly-embed".
                  React's typed JSX disallows `name` on a div, so we drop in the
                  exact markup via dangerouslySetInnerHTML — same shape as
                  Termly's docs. */}
              <div
                dangerouslySetInnerHTML={{
                  __html: `<div name="termly-embed" data-id="${TERMLY_UUID}" data-type="iframe"></div>`,
                }}
              />
              <Script
                id="termly-embed-loader"
                src="https://app.termly.io/embed-policy.min.js"
                strategy="afterInteractive"
              />
            </>
          ) : (
            <div className="prose prose-slate max-w-none">
              <p>
                Our cookie policy is currently being prepared. In the meantime, see our{' '}
                <a href="/privacy-policy" className="text-[#407df1] hover:underline">
                  Privacy Policy
                </a>{' '}
                for how we handle personal data.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
