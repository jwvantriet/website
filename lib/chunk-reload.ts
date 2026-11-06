'use client';

// A tab opened before a deploy still runs the old deployment's JavaScript.
// When it needs a chunk that deploy no longer serves, Next.js throws a
// ChunkLoadError ("Loading chunk 177 failed") and the visitor gets the error
// page, for something a reload fixes. So reload, once.
//
// At most once per page per minute (sessionStorage), so a chunk that is
// broken in the CURRENT deployment shows the error page after one reload
// instead of looping. No sessionStorage (blocked, private mode) means no
// reload: then we cannot tell a loop from a first try.
//
// Same for "Connection closed.": React's error when the RSC stream of a
// client-side navigation is cut off (network drop, a deploy swapping the
// function mid-response). The page itself is fine; a reload refetches it.
// On 2026-11-05 a visitor filtering /vacancies got the error page twice.

const KEY = 'confair:chunk-reload';
const WINDOW_MS = 60_000;

export function isChunkLoadError(error: unknown): boolean {
  const e = error as { name?: unknown; message?: unknown } | null;
  if (!e) return false;
  if (e.name === 'ChunkLoadError') return true;
  const message = String(e.message ?? '');
  return /Loading (CSS )?chunk [\w-]+ failed/i.test(message) || /^Connection closed\.?$/.test(message.trim());
}

/**
 * Reloads the page and returns true when `error` is a stale-deploy chunk
 * failure that has not been retried on this page in the last minute.
 * Returns false otherwise: the caller shows the error page and reports it.
 */
export function reloadOnceForChunkError(error: unknown): boolean {
  if (typeof window === 'undefined' || !isChunkLoadError(error)) return false;
  try {
    const path = window.location.pathname;
    const last = JSON.parse(window.sessionStorage.getItem(KEY) || 'null') as { path?: string; at?: number } | null;
    if (last?.path === path && typeof last.at === 'number' && Date.now() - last.at < WINDOW_MS) return false;
    window.sessionStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}
