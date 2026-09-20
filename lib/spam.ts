/**
 * Heuristic spam screening for the public lead forms (contact + salary guide).
 *
 * Every submission now flows into the HubSpot pipeline, so bot spam directly
 * pollutes sales reporting. These checks target the exact patterns observed
 * in contact_submissions (link-stuffed pitches, gibberish bot entries,
 * instant submissions) while staying invisible to genuine visitors:
 *
 * - Honeypot: a hidden "website" field humans never see or fill.
 * - Time gate: forms submitted within seconds of render are bots — humans
 *   need time to type.
 * - Content heuristics: multiple URLs in the message, or no-space gibberish
 *   tokens as name/message.
 *
 * Suspected spam is dropped SILENTLY (the caller shows the normal success
 * state) so bots get no signal to adapt to. Decisions are logged server-side
 * for observability. Deliberately conservative — a rare false negative is
 * fine; a false positive (losing a real client enquiry) is not.
 */

export type SpamVerdict = { spam: boolean; reason?: string };

const MIN_FILL_MS = 3000;

function looksLikeGibberish(value: string): boolean {
  const v = value.trim();
  // Single unbroken mixed-case token, long, no spaces — matches the observed
  // bot entries ("tSbzmzOWxlZgUFKVhBjVwZb"). Real names and messages contain
  // spaces at this length.
  return v.length > 15 && !v.includes(' ') && /[a-z]/.test(v) && /[A-Z]/.test(v);
}

function countUrls(value: string): number {
  return (value.match(/https?:\/\//gi) ?? []).length;
}

export function screenSubmission(input: {
  name: string;
  message: string;
  honeypot: string;
  startedAtMs: number;
}): SpamVerdict {
  if (input.honeypot.trim() !== '') {
    return { spam: true, reason: 'honeypot' };
  }

  const elapsed = Date.now() - input.startedAtMs;
  // startedAtMs of 0/NaN means the client never set it — a non-browser bot
  // posting the form directly.
  if (!Number.isFinite(input.startedAtMs) || input.startedAtMs <= 0) {
    return { spam: true, reason: 'no-timer' };
  }
  if (elapsed >= 0 && elapsed < MIN_FILL_MS) {
    return { spam: true, reason: `too-fast (${elapsed}ms)` };
  }

  if (countUrls(input.message) >= 2) {
    return { spam: true, reason: 'link-stuffed' };
  }

  if (looksLikeGibberish(input.name) || looksLikeGibberish(input.message)) {
    return { spam: true, reason: 'gibberish' };
  }

  return { spam: false };
}

/**
 * Spam screening for the vacancy apply form.
 *
 * Deliberately NOT screenSubmission(). The cost of a false positive is not the
 * same: dropping a lead loses an enquiry we can chase, dropping an application
 * loses a type-rated captain who believes they applied and will never hear
 * back. So this keeps only the checks that cannot plausibly fire on a real
 * candidate:
 *
 * - Honeypot — the hidden "website" field. A human never sees it, a form-
 *   filling bot does. No false positives.
 * - Missing timer — a client that posts straight at the server action never
 *   rendered <SpamShieldFields/>, so it has no timestamp to send.
 *
 * Two checks from the lead forms are deliberately ABSENT:
 *
 * - The 3s minimum fill time. A candidate with browser autofill and a CV
 *   already to hand can beat it, and any threshold low enough to be safe for
 *   them is also low enough for a script to sleep past. It buys nothing and
 *   risks the one submission on this site we cannot afford to lose.
 * - The gibberish/link-stuffing heuristics. There is no free-text field left
 *   on this form to stuff, and real pilot names — transliterated, single
 *   token, mixed case — trip looksLikeGibberish().
 */
export function screenApplication(input: {
  honeypot: string;
  startedAtMs: number;
}): SpamVerdict {
  if (input.honeypot.trim() !== '') {
    return { spam: true, reason: 'honeypot' };
  }
  if (!Number.isFinite(input.startedAtMs) || input.startedAtMs <= 0) {
    return { spam: true, reason: 'no-timer' };
  }
  return { spam: false };
}
