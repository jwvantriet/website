/**
 * First-touch marketing attribution.
 *
 * Captures where a visitor came from (UTM tags, referrer, landing page) the
 * first time they arrive, persists it in a cookie, and hands it to the contact
 * form's server action so every lead reaches HubSpot tagged with the marketing
 * activity that produced it — cold-email, LinkedIn, organic/SEO or a trade-show
 * QR code, depending on the campaign's UTM parameters.
 *
 * "First touch" wins: once the cookie is set we don't overwrite it, so the
 * original source survives later internal navigation and return visits.
 *
 * Consent: capture is gated on Cookiebot marketing consent by the
 * <AttributionTracker> component, so nothing is stored before the visitor
 * opts in. This module just reads/writes the cookie.
 */

export const ATTRIBUTION_COOKIE = 'confair_attribution';
const MAX_AGE_DAYS = 90;

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
};

const UTM_KEYS: (keyof Attribution)[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
];

/** Safely parse the cookie value (used on both client and server). */
export function parseAttribution(raw: string | undefined | null): Attribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return parsed && typeof parsed === 'object' ? (parsed as Attribution) : null;
  } catch {
    return null;
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : undefined;
}

/**
 * Read first-touch attribution from the URL + referrer and persist it, unless
 * it's already been captured. No-op on the server or when there's nothing
 * worth recording (no UTM tags and only a same-site referrer). Browser only.
 */
export function captureFirstTouch(): void {
  if (typeof window === 'undefined') return;
  if (readCookie(ATTRIBUTION_COOKIE)) return; // first touch already recorded

  const params = new URLSearchParams(window.location.search);
  const data: Attribution = {};
  for (const key of UTM_KEYS) {
    const val = params.get(key);
    if (val) data[key] = val.slice(0, 500);
  }

  // Record an external referrer (search engine, LinkedIn, etc.) for visits
  // that arrive without UTM tags — that's the organic/SEO signal.
  const ref = document.referrer;
  if (ref && !ref.includes(window.location.host)) {
    data.referrer = ref.slice(0, 500);
  }

  // Nothing meaningful to attribute (direct, same-site) — don't set a cookie.
  if (Object.keys(data).length === 0) return;

  data.landing_page = (window.location.pathname + window.location.search).slice(0, 500);

  const value = encodeURIComponent(JSON.stringify(data));
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${ATTRIBUTION_COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
