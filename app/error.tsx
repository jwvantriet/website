'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/report-client-error';

// Shown instead of Next.js's bare "Application error" when a page crashes in
// the browser, and reported to Confair (lib/report-client-error.ts): before
// this, a crash on a form left no trace anywhere.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <section className="bg-gray-50 min-h-[60vh] flex items-center">
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-cblue-700 text-sm font-semibold uppercase tracking-wider mb-3">Error</p>
        <h1 className="text-4xl md:text-5xl font-bold text-navy mb-4">Something went wrong</h1>
        <p className="text-navy-500 text-lg mb-8">
          Our team has been notified. Please try again; if you were sending a form and it still
          fails, email us at{' '}
          <a href="mailto:netherlands@confair.com" className="text-cblue-700 underline">
            netherlands@confair.com
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-block bg-yellow text-navy px-7 py-3.5 rounded-lg font-bold hover:bg-yellow-600 transition-colors"
        >
          Try again
        </button>
      </div>
    </section>
  );
}
