'use client';

// Tell the server a visitor just saw an error page (app/api/client-error →
// confair-api → mail). Once per error object, best-effort, never throws.
const reported = new WeakSet<object>();

export function reportClientError(error: Error & { digest?: string }) {
  if (reported.has(error)) return;
  reported.add(error);
  try {
    const body = JSON.stringify({
      message: String(error?.message || 'Unknown error').slice(0, 1000),
      digest: error?.digest,
      stack: String(error?.stack || '').slice(0, 3000),
      route: window.location.pathname,
    });
    if (navigator.sendBeacon?.('/api/client-error', new Blob([body], { type: 'application/json' }))) return;
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never make the error page itself fail.
  }
}
