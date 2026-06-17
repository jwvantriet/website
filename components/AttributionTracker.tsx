'use client';

import { useEffect } from 'react';
import { captureFirstTouch } from '@/lib/attribution';

/**
 * Records first-touch marketing attribution (see lib/attribution.ts), gated on
 * Cookiebot marketing consent so nothing is stored before the visitor opts in.
 *
 * Mounted once in the root layout. Renders nothing.
 */
export default function AttributionTracker() {
  useEffect(() => {
    const w = window as unknown as {
      Cookiebot?: { consent?: { marketing?: boolean } };
    };

    const captureIfConsented = () => {
      if (w.Cookiebot?.consent?.marketing) captureFirstTouch();
    };

    if (w.Cookiebot) {
      // Consent already decided this session, or capture once it's granted.
      captureIfConsented();
      window.addEventListener('CookiebotOnAccept', captureIfConsented);
      return () => window.removeEventListener('CookiebotOnAccept', captureIfConsented);
    }

    // No Cookiebot present (local dev / preview) — capture so the funnel can
    // be tested end to end. In production Cookiebot is always loaded.
    captureFirstTouch();
  }, []);

  return null;
}
