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
import LegalPageLayout from '@/components/LegalPageLayout';
import CookieDeclaration from '@/components/CookieDeclaration';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Cookie policy of Confair Consultancy BV — how we use cookies on confair.com.',
};

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      subtitle="How Confair Group uses cookies and similar technologies on confair.com."
      prose={false}
    >
      {/* Cookiebot styles its own declaration, so we skip the prose
          wrapper and let it render as-is inside the card. */}
      <CookieDeclaration />
    </LegalPageLayout>
  );
}
