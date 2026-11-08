/**
 * Per-vertical content for the industry landing pages
 * (/industries/[slug]). Single source of truth for the aviation, maritime and
 * offshore pages: hero copy, certifications, roles, client types, FAQ, and SEO
 * metadata. Icons + brand colours are mapped by slug in the page component.
 *
 * Positioning: each page leads with Confair's end-to-end USP (one partner from
 * vacancy to payroll) and backs it with sector-specific proof — the
 * certifications, roles and client types buyers compare agencies on.
 */
export type VerticalSlug = 'aviation' | 'maritime' | 'offshore';

export type Vertical = {
  slug: VerticalSlug;
  name: string; // "Confair Aviation"
  shortName: string; // "Aviation"
  eyebrow: string;
  heroHeadline: string;
  heroSub: string;
  intro: string;
  certifications: string[];
  roles: string[];
  clientTypes: string[];
  differentiators: string[];
  faq: { q: string; a: string }[];
  metaTitle: string;
  metaDescription: string;
  /**
   * A sector Confair is entering rather than one it has a track record in.
   * The page then says so: no "we deploy" claims, a named person instead of a
   * team, and a talent pool instead of vacancies. Flip to false only once
   * there are real placements to point at.
   */
  isNew: boolean;
  /** Optional photo strip above the roles section (real photos only). */
  gallery?: { src: string; alt: string }[];
  /** Section headings — a new sector cannot say "roles we supply". */
  whyHeading: string;
  rolesHeading: string;
  clientsHeading: string;
};

/** The person a buyer or candidate in a new sector talks to. */
export const NEW_SECTOR_CONTACT = {
  name: "Jan Willem van 't Riet",
  firstName: 'Jan Willem',
  initials: 'JW',
  role: 'Your contact for Confair Maritime & Offshore',
  email: 'jw.vantriet@confair.com',
  phone: '+31 850 711 950',
  phoneHref: 'tel:+31850711950',
} as const;

const ONE_PARTNER =
  'And because Confair connects recruitment, compliance, onboarding, workforce ' +
  'management and payroll into one partnership, you get certified people in ' +
  'place fast — without stitching together agencies, compliance vendors and ' +
  'payroll providers yourself.';

export const VERTICALS: Record<VerticalSlug, Vertical> = {
  aviation: {
    slug: 'aviation',
    name: 'Confair Aviation',
    shortName: 'Aviation',
    eyebrow: 'Aviation Workforce Solutions',
    heroHeadline: 'Aviation workforce — from vacancy to payroll',
    heroSub:
      'Certified pilots, engineers and crew for airlines, MROs and airports — sourced, verified, deployed and paid through one connected partner.',
    intro:
      'We provide certified aviation professionals to airlines, MRO facilities, airports and aviation service providers worldwide. Our specialists are fully licensed and experienced within strict regulatory frameworks including EASA, FAA and ICAO. ' +
      ONE_PARTNER,
    certifications: ['EASA licensed', 'FAA certified', 'FAA Part-147', 'ICAO standards'],
    roles: [
      'Licensed Pilots (EASA & FAA certified)',
      'Licensed Aircraft Engineers (B1/B2)',
      'Cabin Crew & Flight Attendants',
      'Aviation Safety Officers',
      'Ground Handling Specialists',
      'Airport Operations Managers',
      'Quality & Compliance Auditors',
    ],
    clientTypes: ['Airlines & operators', 'MRO facilities', 'Airports & ground services', 'Aviation service providers'],
    differentiators: [
      'EASA & FAA licensed and certified professionals',
      'Rapid deployment — often within 48 hours',
      'Short- and long-term contracts',
      'Full documentation & compliance managed for you',
    ],
    faq: [
      {
        q: 'What certifications do your aviation professionals hold?',
        a: 'Our pilots, engineers and crew are licensed to EASA and FAA standards as required, including FAA Part-147 for maintenance roles, and are experienced operating within ICAO frameworks. We verify and manage every credential before deployment.',
      },
      {
        q: 'How quickly can you deploy aviation staff?',
        a: 'For many roles we mobilise pre-vetted professionals within 48 hours, because certification, documentation and compliance checks are handled continuously rather than at the point of hire.',
      },
      {
        q: 'Which aviation roles can you supply?',
        a: 'Licensed pilots, B1/B2 aircraft engineers, cabin crew, aviation safety officers, ground handling specialists, airport operations managers and quality/compliance auditors — for short-term cover or long-term programmes.',
      },
      {
        q: 'Do you handle compliance and payroll as well as recruitment?',
        a: 'Yes. Confair is one connected partner from vacancy to payroll — we manage sourcing, verification, onboarding, compliance and payroll, so you deal with one contract instead of several vendors.',
      },
    ],
    metaTitle: 'Aviation Staffing & Workforce Solutions | EASA & FAA Certified',
    metaDescription:
      'Confair Aviation supplies EASA- and FAA-certified pilots, engineers and crew to airlines, MROs and airports — recruitment, compliance and payroll in one partner. Deploy in as little as 48 hours.',
    isNew: false,
    // Confair's own shoot. A third photo (an engineer at work) is still to come.
    gallery: [
      { src: '/images/site/confair-simulator-team.jpg', alt: 'Confair team members with a pilot in the flight simulator' },
      { src: '/images/site/confair-simulator-assessment.jpg', alt: 'A pilot at the controls in the flight simulator, observed by two Confair colleagues' },
    ],
    whyHeading: 'One connected partner, from vacancy to payroll',
    rolesHeading: 'Key roles we supply',
    clientsHeading: 'Who we work with',
  },
  // Maritime and offshore are sectors Confair is ENTERING (2026). Everything
  // below must stay true for a company with no placements there yet: what we
  // bring is the aviation track record and the systems behind it. Until
  // 2026-11-08 these pages said "every officer we deploy…", "24/7 operational
  // support" and "we mobilise globally at short notice" — claims a buyer in a
  // small industry checks in the first call.
  maritime: {
    slug: 'maritime',
    name: 'Confair Maritime',
    shortName: 'Maritime',
    eyebrow: 'Confair Maritime — new in 2026',
    heroHeadline: 'Maritime crewing, built on 30 years of aviation crew management',
    heroSub:
      'We are building Confair Maritime: STCW-certified officers, engineers and ratings, managed with the same certificate tracking, onboarding and payroll we run for airline crews in 40+ countries.',
    intro:
      'Confair has placed certified crew with airlines since 1995 — more than 3,000 aviation professionals in over 40 countries. Shipping runs on the same things aviation does: people who may only work with valid certificates, rotations planned around them, and contracts and payroll across borders. ' +
      'We are now bringing that way of working to maritime. We are new to the sector and say so plainly: we have no maritime placements to show you yet. What we can show you is how we run certified crews today, and a named person who will answer your call.',
    certifications: ['STCW 2010 (Manila)', 'MLC 2006', 'Flag-state requirements'],
    roles: [
      'Masters & Deck Officers',
      'Chief Officers',
      'Chief & Marine Engineers',
      'Able Seamen & Ratings',
      'Crew for offshore wind vessels (CTV / SOV)',
    ],
    clientTypes: ['Ship owners & managers', 'Offshore wind vessel operators', 'Shipyards & repair yards', 'Ports & terminals'],
    differentiators: [
      'Certificate and expiry tracking per person, from day one',
      'Onboarding, contracts and payroll from one system',
      'Entities in the Netherlands, Germany and the UAE',
      'One named contact — not a call centre',
    ],
    faq: [
      {
        q: 'Have you placed maritime crew before?',
        a: 'Not as Confair Maritime — we are entering the sector in 2026. Our track record is in aviation: certified crew placed with airlines since 1995, in more than 40 countries. The work that makes that reliable — checking certificates, tracking their expiry, onboarding and payroll across borders — is what we are bringing to maritime.',
      },
      {
        q: 'Which roles are you building a pool for?',
        a: 'Masters and deck officers, chief officers, chief and marine engineers, able seamen and ratings, and crew for offshore wind vessels. If you are a seafarer in one of these roles, you can join the talent pool now.',
      },
      {
        q: 'Who do I talk to?',
        a: `Jan Willem van 't Riet leads Confair Maritime & Offshore. Use the form on this page, or e-mail jw.vantriet@confair.com.`,
      },
    ],
    metaTitle: 'Maritime Crewing — STCW Officers, Engineers & Ratings',
    metaDescription:
      'Confair Maritime is new in 2026: STCW-certified officers, engineers and ratings, managed with the certificate tracking, onboarding and payroll we run for airline crews since 1995. Join the talent pool.',
    isNew: true,
    whyHeading: 'What we bring from aviation',
    rolesHeading: 'Roles we are building a pool for',
    clientsHeading: 'Who we want to talk to',
  },
  offshore: {
    slug: 'offshore',
    name: 'Confair Offshore',
    shortName: 'Offshore Energy',
    eyebrow: 'Confair Offshore — new in 2026',
    heroHeadline: 'Offshore energy crew, built on 30 years of aviation crew management',
    heroSub:
      'We are building Confair Offshore: BOSIET-, HUET- and GWO-certified professionals for oil, gas and offshore wind, managed with the certificate tracking, onboarding and payroll we run for airline crews in 40+ countries.',
    intro:
      'Confair has placed certified crew with airlines since 1995 — more than 3,000 aviation professionals in over 40 countries. Offshore energy runs on the same things aviation does: people who may only work with valid certificates, rotations, and contracts and payroll across borders. It also runs on aviation itself: every offshore helicopter needs licensed pilots and engineers, which is work we already do. ' +
      'We are new to offshore energy and say so plainly: we have no offshore placements to show you yet. What we can show you is how we run certified crews today, and a named person who will answer your call.',
    certifications: ['BOSIET / FOET', 'HUET', 'GWO', 'Offshore medical'],
    roles: [
      'Offshore helicopter pilots & licensed engineers',
      'Dynamic Positioning Operators (DPO)',
      'ROV Pilots & Technicians',
      'Offshore Wind Technicians (GWO)',
      'HSE Officers & Advisors',
    ],
    clientTypes: ['Offshore helicopter operators', 'Offshore wind developers & O&M contractors', 'Oil & gas operators', 'Energy service contractors'],
    differentiators: [
      'Certificate and expiry tracking per person, from day one',
      'Aviation licensing know-how for offshore helicopter crews',
      'Onboarding, contracts and payroll from one system',
      'One named contact — not a call centre',
    ],
    faq: [
      {
        q: 'Have you placed offshore energy crew before?',
        a: 'Not as Confair Offshore — we are entering the sector in 2026. Our track record is in aviation: certified crew placed with airlines since 1995, in more than 40 countries. That includes the licensing that offshore helicopter pilots and engineers work under, which is where aviation and offshore energy meet.',
      },
      {
        q: 'Which roles are you building a pool for?',
        a: 'Offshore helicopter pilots and licensed engineers, Dynamic Positioning Operators, ROV pilots and technicians, offshore wind technicians and HSE officers. If you work in one of these roles, you can join the talent pool now.',
      },
      {
        q: 'Who do I talk to?',
        a: "Jan Willem van 't Riet leads Confair Maritime & Offshore. Use the form on this page, or e-mail jw.vantriet@confair.com.",
      },
    ],
    metaTitle: 'Offshore Energy Crew — DPO, ROV, GWO & Helicopter Crew',
    metaDescription:
      'Confair Offshore is new in 2026: BOSIET-, HUET- and GWO-certified crew for oil, gas and offshore wind, plus offshore helicopter pilots and engineers. Built on 30 years of aviation crew management. Join the talent pool.',
    isNew: true,
    whyHeading: 'What we bring from aviation',
    rolesHeading: 'Roles we are building a pool for',
    clientsHeading: 'Who we want to talk to',
  },
};

export const VERTICAL_SLUGS = Object.keys(VERTICALS) as VerticalSlug[];
