import type { Vacancy } from '@/lib/types';

/**
 * The dates a vacancy shows. Both come from Carerix (via the vacancy sync) and
 * must agree with the JobPosting data Google reads (`datePosted` in
 * lib/structured-data.ts).
 *
 * Until 2026-11-08 the site showed every vacancy as "Posted 1 January 2026"
 * and "Updated" as the visit date minus 14 days, while the structured data
 * carried the real date. Google for Jobs treats a misrepresented date as a
 * policy violation, and a pilot who sees the same ad "updated 2 weeks ago" on
 * every visit stops believing the page. If a real date looks too old, the fix
 * is to refresh or close the vacancy in Carerix, not to change what we show.
 */
export function vacancyPostedAt(v: Pick<Vacancy, 'publication_start' | 'posted_date'>): string {
  return v.publication_start ?? v.posted_date;
}

export function vacancyUpdatedAt(
  v: Pick<Vacancy, 'modification_date' | 'publication_start' | 'posted_date'>,
): string {
  return v.modification_date ?? vacancyPostedAt(v);
}
