'use client';

import { domGuardHint } from './dom-guard';

// Tell the server a visitor just saw an error page (app/api/client-error →
// confair-api → the Error Log at /dashboard/errors). Once per error object,
// best-effort, never throws. A stale-deploy chunk error is reloaded once
// first (lib/chunk-reload.ts) and only reported if that did not help.
const reported = new WeakSet<object>();

/**
 * What the browser had done to the page, read from the page itself. Two
 * iPhone Safari crashes on 2026-11-02 ("The object can not be found here.")
 * were React failing to insert into a DOM something outside React had
 * changed, and the report could not say what. The candidates:
 *  - Safari's data detectors turning text into its own links. We switched
 *    them off (format-detection in app/layout.tsx), so any such link is news.
 *  - Page translation: the page language no longer English, or the
 *    translator's markers (Google's `translated-*` class, `<font>` wrappers).
 *  - Whether lib/dom-guard.ts had to absorb a call on this page, and which.
 * Counts and language codes only — never page text, never anything typed.
 */
function pageHints(): string {
  try {
    const html = document.documentElement;
    const parts = [
      `data-detector links: ${document.querySelectorAll('a[x-apple-data-detectors]').length}`,
      `page lang: ${html.lang || '-'}`,
      `browser lang: ${navigator.language || '-'}`,
    ];
    const translated = Array.from(html.classList).filter((c) => c.startsWith('translated-'));
    if (translated.length) parts.push(`translator class: ${translated.join(' ')}`);
    const fonts = document.body?.getElementsByTagName('font').length ?? 0;
    if (fonts) parts.push(`<font> wrappers: ${fonts}`);
    const guard = domGuardHint();
    if (guard) parts.push(guard);
    return parts.join('; ').slice(0, 300);
  } catch {
    return '';
  }
}

export function reportClientError(error: Error & { digest?: string }) {
  if (reported.has(error)) return;
  reported.add(error);
  try {
    const body = JSON.stringify({
      message: String(error?.message || 'Unknown error').slice(0, 1000),
      digest: error?.digest,
      stack: String(error?.stack || '').slice(0, 3000),
      route: window.location.pathname,
      hints: pageHints(),
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
