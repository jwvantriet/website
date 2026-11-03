'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/report-client-error';
import { reloadOnceForChunkError } from '@/lib/chunk-reload';

// Last resort when the root layout itself crashes: it replaces the whole
// document, so it renders its own <html> and cannot rely on the site's CSS.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Old JavaScript after a deploy: a reload fixes it, so do that once and
    // report only if it did not help (lib/chunk-reload.ts).
    if (reloadOnceForChunkError(error)) return;
    reportClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'Arial, sans-serif', textAlign: 'center', padding: '80px 24px', color: '#14213d' }}>
        <h1>Something went wrong</h1>
        <p>
          Our team has been notified. Please try again, or email{' '}
          <a href="mailto:netherlands@confair.com">netherlands@confair.com</a>.
        </p>
        <button type="button" onClick={() => reset()} style={{ padding: '12px 28px', fontWeight: 700 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
