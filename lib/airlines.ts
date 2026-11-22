/**
 * Airline ("operator") landing pages — /airlines/<slug>.
 *
 * Why these exist: in Search Console (Aug–Nov 2026) the only non-brand demand
 * that already clicked through to confair.com was a pilot searching for an
 * operator by name — "air atlanta careers", "air atlanta icelandic pilot jobs",
 * "air atlanta 777" — and it landed on a redirect to a filtered vacancy list.
 * A page that lists that operator's open contracts and answers the questions
 * people type is what those searches were looking for.
 *
 * The copy below is a statement about a CLIENT, on a public page. Every
 * sentence was supplied or approved by Confair; do not add facts about an
 * airline (fleet sizes, pay, rating costs, bonds, bases) that Confair has not
 * signed off. Pay and type-rating terms are deliberately not published.
 *
 * To add an airline: add an entry here. The route, sitemap entry, footer link
 * and the link from that operator's vacancy pages all follow from it.
 */

export type AirlineFleet = {
  /** Heading of the vacancy group, e.g. "Boeing 747-400". */
  name: string;
  /** Matched against the vacancy title to put a role in this group. */
  match: RegExp;
};

export type Airline = {
  slug: string;
  /** Short name used in headings and links. */
  name: string;
  /**
   * Matched against `vacancies.company_name` (case-insensitive, as a prefix)
   * to find this airline's open contracts. One airline can be several legal
   * entities in Carerix ("Air Atlanta Icelandic", "Air Atlanta Europe Ltd").
   */
  companyPrefix: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  hero: { src: string; alt: string };
  fleets: AirlineFleet[];
  faq: { q: string; a: string }[];
};

export const AIRLINES: Record<string, Airline> = {
  'air-atlanta': {
    slug: 'air-atlanta',
    name: 'Air Atlanta',
    companyPrefix: 'Air Atlanta',
    metaTitle: 'Air Atlanta Careers: B747 & B777 Pilot and Engineer Jobs',
    metaDescription:
      'Open contracts with Air Atlanta Icelandic and Air Atlanta Europe: type-rated and non-type-rated captains and first officers, Part-66 B1/B2 engineers and flying loadmasters. Apply through Confair.',
    h1: 'Air Atlanta careers: Boeing 747 and 777 pilot, engineer and loadmaster jobs',
    intro:
      'Confair recruits flight crew and licensed engineers for Air Atlanta Icelandic and Air Atlanta Europe. Every open contract is listed below, with type-rated and non-type-rated routes.',
    hero: {
      src: '/images/site/air-atlanta-icelandic-boeing-747-freighter.jpg',
      alt: 'Air Atlanta Icelandic Boeing 747 freighter on the apron with its nose cargo door open',
    },
    fleets: [
      { name: 'Boeing 747-400', match: /\b(b)?747\b/i },
      { name: 'Boeing 777', match: /\b(b)?777\b/i },
    ],
    faq: [
      {
        q: 'What is the difference between Air Atlanta Icelandic and Air Atlanta Europe?',
        a: 'Air Atlanta Icelandic is an Icelandic airline specialised in ACMI operations (aircraft, crew, maintenance and insurance) and charter flights, mainly with wide-body aircraft. Air Atlanta Europe is a European airline in the same group with its own Air Operator Certificate (AOC) in Malta. Both operate within one group, under different operating licences and aviation authorities.',
      },
      {
        q: 'Do I need a Boeing 747 or 777 type rating to apply?',
        a: 'No. There are separate type-rated and non-type-rated roles for captains and first officers. The terms are confirmed per vacancy and contract.',
      },
      {
        q: 'Where are crews based and what is the roster pattern?',
        a: 'Air Atlanta operates internationally, so the operational base depends on the ACMI assignment and where the aircraft is deployed. Pilots usually work in rotations, with periods on location followed by time off at home. The exact rotation and base are confirmed per vacancy and contract.',
      },
      {
        q: 'Does Confair recruit cabin crew for Air Atlanta?',
        a: 'Not at the moment. Confair currently recruits flight crew, licensed engineers and loadmasters for Air Atlanta.',
      },
    ],
  },
};

export const AIRLINE_SLUGS = Object.keys(AIRLINES);

export function airlinePath(slug: string): string {
  return `/airlines/${slug}`;
}

/** The airline page for a vacancy's operator, if it has one. */
export function airlineForCompany(companyName: string | null | undefined): Airline | null {
  const name = (companyName ?? '').trim().toLowerCase();
  if (!name) return null;
  return (
    Object.values(AIRLINES).find((a) => name.startsWith(a.companyPrefix.toLowerCase())) ?? null
  );
}

/**
 * Splits an airline's vacancies into its fleets, in the order the fleets are
 * declared. A role that names no fleet (a loadmaster, say) is returned under
 * `other` rather than guessed into one.
 */
export function groupByFleet<T extends { title: string }>(
  airline: Airline,
  vacancies: T[],
): { groups: { name: string; vacancies: T[] }[]; other: T[] } {
  const groups = airline.fleets.map((f) => ({ name: f.name, vacancies: [] as T[] }));
  const other: T[] = [];
  for (const v of vacancies) {
    const i = airline.fleets.findIndex((f) => f.match.test(v.title));
    if (i === -1) other.push(v);
    else groups[i].vacancies.push(v);
  }
  return { groups: groups.filter((g) => g.vacancies.length > 0), other };
}
