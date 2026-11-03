// Server-only: forward an error to confair-api, which mails Confair
// (confair-api: services/website_error_alerts.js, POST /webhooks/website/error).
//
// Why: from 27 Oct to 1 Nov 2026 the forms crashed for some visitors and
// uploads over 1 MB were refused, and nobody knew for five days.
//
// Production only, so previews and local builds do not mail anyone. Never
// throws and never waits long: the request that hit the error must not get
// slower or fail again because reporting it failed.

export type ErrorReport = {
  kind: 'server' | 'client';
  message: string;
  route?: string;
  digest?: string;
  stack?: string;
  userAgent?: string;
  /** Browser-side page state (lib/report-client-error.ts `pageHints`). */
  hints?: string;
};

export async function reportError(report: ErrorReport): Promise<void> {
  if (process.env.VERCEL_ENV !== 'production') return;
  const apiUrl = process.env.CONFAIR_API_URL || '';
  const secret = process.env.WEBSITE_WEBHOOK_SECRET || '';
  if (!apiUrl || !secret) return;
  try {
    await fetch(`${apiUrl.replace(/\/+$/, '')}/webhooks/website/error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ ...report, deploymentId: process.env.VERCEL_DEPLOYMENT_ID || undefined }),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Reporting is best-effort; the error itself is already in Vercel's logs.
  }
}
