'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics';

/**
 * Counts the times lib/dom-guard.ts kept a changed page from crashing, as the
 * Vercel Web Analytics custom event `dom_conflict_absorbed` — once per page
 * load, with the call (`insertBefore` / `removeChild`) and the path. Without
 * it, the guard would turn a crash we hear about into one we never see.
 * A lower bound, like the stale-action events: visitors who block analytics or
 * have not given Cookiebot's statistics consent are not counted.
 *
 * Mounted once in the root layout. Renders nothing.
 */
export default function DomGuardReporter() {
  useEffect(() => {
    const w = window as {
      __domGuard?: { count?: number; ops?: string[] };
      __domGuardOnNote?: (op: string) => void;
      va?: unknown;
    };
    let sent = false;
    const send = (op: string, tries = 20) => {
      if (sent) return;
      try {
        // track() drops the event if <Analytics /> has not set window.va up
        // yet (see lib/stale-action.ts): wait up to 5 s for it.
        if (!w.va) {
          if (tries > 0) setTimeout(() => send(op, tries - 1), 250);
          return;
        }
        sent = true;
        track('dom_conflict_absorbed', { op, path: window.location.pathname });
      } catch {
        // Counting must never break the page.
      }
    };
    w.__domGuardOnNote = send;
    // Absorbed before this mounted (during hydration).
    const first = w.__domGuard?.ops?.[0];
    if (first) send(first.split(' ')[0]);
    return () => {
      if (w.__domGuardOnNote === send) delete w.__domGuardOnNote;
    };
  }, []);
  return null;
}
