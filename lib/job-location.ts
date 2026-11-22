/**
 * Turns a vacancy's free-text location into the address Google for Jobs reads.
 *
 * Carerix gives us one text field (`CRPublication.workLocation`), typed by a
 * recruiter: "Helsinki", "Spain", "UAE", "Several". Google asks for a place
 * with a country (`addressCountry`), and until this existed every vacancy sent
 * the raw text as a city with no country at all — "Several" included. In three
 * months (Aug–Nov 2026) the job-listing appearance got 58 impressions across
 * some twenty vacancies.
 *
 * What a recruiter should type in Carerix is "City, Country" ("Kigali,
 * Rwanda"). This reads that, a bare country, or a bare city we know; anything
 * else is passed through as it was, so nothing that worked before stops
 * working. It never invents a place: "Several" has no country and gets none.
 */

export type JobAddress = {
  addressLocality?: string;
  addressCountry?: string;
};

// ISO 3166-1 codes that Intl lists but that are not countries.
const NOT_COUNTRIES = new Set(['EU', 'EZ', 'UN', 'QO', 'ZZ', 'XA', 'XB']);

// What recruiters write that Intl's English names do not cover.
const COUNTRY_ALIASES: Record<string, string> = {
  uae: 'AE',
  'u.a.e.': 'AE',
  emirates: 'AE',
  uk: 'GB',
  'u.k.': 'GB',
  'great britain': 'GB',
  england: 'GB',
  scotland: 'GB',
  usa: 'US',
  'u.s.a.': 'US',
  us: 'US',
  holland: 'NL',
  'the netherlands': 'NL',
  turkey: 'TR',
  turkiye: 'TR',
  'czech republic': 'CZ',
  'ivory coast': 'CI',
  'south korea': 'KR',
  russia: 'RU',
  'hong kong': 'HK',
};

// Cities that appear on their own in Carerix. Add one when a vacancy uses it.
const KNOWN_CITIES: Record<string, string> = {
  helsinki: 'FI',
  birkirkara: 'MT',
  luqa: 'MT',
  valletta: 'MT',
  kigali: 'RW',
  reykjavik: 'IS',
  keflavik: 'IS',
  kopavogur: 'IS',
  dubai: 'AE',
  sharjah: 'AE',
  'abu dhabi': 'AE',
  amsterdam: 'NL',
  utrecht: 'NL',
  liege: 'BE',
  madrid: 'ES',
  budapest: 'HU',
  jeddah: 'SA',
  riyadh: 'SA',
  karachi: 'PK',
};

// Text that says "no single place". These get no address.
const NOT_A_PLACE = new Set([
  'several',
  'various',
  'multiple',
  'worldwide',
  'international',
  'global',
  'europe',
  'asia',
  'africa',
  'middle east',
  'tbd',
  'tba',
  'n/a',
  'to be discussed',
  'to be confirmed',
]);

function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

let countryByName: Map<string, string> | null = null;

function countries(): Map<string, string> {
  if (countryByName) return countryByName;
  const map = new Map<string, string>();
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const a of letters) {
    for (const b of letters) {
      const code = a + b;
      if (NOT_COUNTRIES.has(code)) continue;
      let name: string | undefined;
      try {
        name = names.of(code);
      } catch {
        continue;
      }
      if (name && name !== code) map.set(normalise(name), code);
    }
  }
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) map.set(alias, code);
  countryByName = map;
  return map;
}

/** ISO country code for a country name as a recruiter would write it. */
export function countryCode(name: string): string | null {
  return countries().get(normalise(name)) ?? null;
}

/** True when the text names no single place ("Several", "Europe", empty). */
export function isNotAPlace(location: string | null | undefined): boolean {
  const text = normalise(location ?? '');
  return !text || NOT_A_PLACE.has(text);
}

/**
 * The address for a vacancy's location text, or null when the text names no
 * single place.
 */
export function jobAddress(location: string | null | undefined): JobAddress | null {
  const raw = (location ?? '').trim();
  if (isNotAPlace(raw)) return null;

  // "City, Country" — the form to use in Carerix.
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const country = countryCode(parts[parts.length - 1]);
    if (country) return { addressLocality: parts[0], addressCountry: country };
  }

  const country = countryCode(raw);
  if (country) return { addressCountry: country };

  const cityCountry = KNOWN_CITIES[normalise(raw)];
  if (cityCountry) return { addressLocality: raw, addressCountry: cityCountry };

  // A place we cannot put a country on: send it as before.
  return { addressLocality: raw };
}
