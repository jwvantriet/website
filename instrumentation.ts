import type { Instrumentation } from 'next';

// Every server-side error (a server action, page or route handler threw) is
// mailed to Confair through confair-api; see lib/report-error.ts.
//
// Two errors we care about reach this hook (checked on Next 15.5):
// "Body exceeded 1 MB limit" and "Failed to find Server Action" from a no-JS
// form post. confair-api ignores the second: since 2026-11-01 the forms
// submit through client code, so a no-JS post with an old id is a bot. A real
// browser's stale submit never reaches the server as an error at all; it is
// caught in the page (lib/stale-action.ts), and a crash there is reported by
// app/error.tsx.
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  const e = err as Error & { digest?: string };
  const { reportError } = await import('./lib/report-error');
  await reportError({
    kind: 'server',
    message: e?.message || String(err),
    route: request.path.split('?')[0],
    digest: e?.digest,
    stack: e?.stack,
    userAgent: request.headers['user-agent'] as string | undefined,
  });
};
