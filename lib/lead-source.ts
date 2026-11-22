/**
 * Where a contact-form lead came from, recorded WITHOUT a cookie.
 *
 * First-touch attribution (lib/attribution.ts) lives in a cookie and is only
 * written after Cookiebot marketing consent, so it is missing for most leads:
 * of the 31 client enquiries between August and November 2026, 30 had no
 * source at all. That left no way to tell whether a client found Confair
 * through Google, LinkedIn or a colleague.
 *
 * This adds two things that need no storage on the visitor's device:
 *
 * - `heard_about`: the visitor's own answer to "How did you find us?". For a
 *   B2B lead this is the most reliable signal there is, and the only one that
 *   survives a forwarded link or a colleague's recommendation.
 * - `form_page` / `form_referrer`: the page the form was sent from and the
 *   page before it, read in the browser at submit time. On a first visit that
 *   lands straight on the form this is the external site (google.com,
 *   linkedin.com); after browsing it is usually a confair.com page, which
 *   still says what the visitor read before getting in touch.
 *
 * Nothing here is written to a cookie or browser storage. The values travel
 * with the form the visitor chooses to send, like the message itself.
 */

export const HEARD_ABOUT_OPTIONS = [
  { value: 'google', label: 'Google or another search engine' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook or Instagram' },
  { value: 'job_board', label: 'A job board' },
  { value: 'colleague', label: 'A colleague or recommendation' },
  { value: 'event', label: 'An event or trade show' },
  { value: 'email', label: 'An email from Confair' },
  { value: 'existing', label: 'We already work with Confair' },
  { value: 'ai_assistant', label: 'An AI assistant (ChatGPT, Gemini, …)' },
  { value: 'other', label: 'Other' },
] as const;

export type HeardAbout = (typeof HEARD_ABOUT_OPTIONS)[number]['value'];

const HEARD_ABOUT_VALUES = new Set<string>(HEARD_ABOUT_OPTIONS.map((o) => o.value));

export type LeadSource = {
  heard_about?: HeardAbout;
  form_page?: string;
  form_referrer?: string;
};

/** A site-relative path, without query string or fragment. */
function cleanPath(raw: string): string | undefined {
  const path = raw.trim().split(/[?#]/)[0];
  if (!path.startsWith('/') || path.startsWith('//')) return undefined;
  return path.slice(0, 200);
}

/**
 * Host and path of the referring page. The query string is dropped: on a
 * search or webmail referrer it can carry the visitor's search terms or
 * mailbox identifiers, which this has no business keeping.
 */
function cleanReferrer(raw: string): string | undefined {
  const text = raw.trim();
  if (!text) return undefined;
  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    const path = url.pathname === '/' ? '' : url.pathname;
    return `${url.hostname}${path}`.slice(0, 300);
  } catch {
    return undefined;
  }
}

/** Reads and cleans the lead-source fields the contact form sends. */
export function leadSourceFromForm(formData: FormData): LeadSource {
  const source: LeadSource = {};

  const heard = String(formData.get('heard_about') || '').trim();
  if (HEARD_ABOUT_VALUES.has(heard)) source.heard_about = heard as HeardAbout;

  const page = cleanPath(String(formData.get('form_page') || ''));
  if (page) source.form_page = page;

  const referrer = cleanReferrer(String(formData.get('form_referrer') || ''));
  if (referrer) source.form_referrer = referrer;

  return source;
}
