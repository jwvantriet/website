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
};

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
  },
  maritime: {
    slug: 'maritime',
    name: 'Confair Maritime',
    shortName: 'Maritime',
    eyebrow: 'Maritime Workforce Solutions',
    heroHeadline: 'Maritime crewing — from vacancy to payroll',
    heroSub:
      'STCW-certified officers, engineers and crew for shipowners, ports and shipyards — one partner for compliant crewing, smooth crew changes and vessels that sail on time.',
    intro:
      'We supply qualified maritime personnel for vessel operations, port services and shipyard projects across the globe. Our professionals hold valid STCW certification and are experienced across diverse vessel types and maritime environments. ' +
      ONE_PARTNER,
    certifications: ['STCW 2010 (Manila)', 'MLC 2006 compliant', 'Flag-state compliance'],
    roles: [
      'Masters & Deck Officers (STCW certified)',
      'Marine Engineers',
      'Shipyard Project Managers',
      'Port & Terminal Operators',
      'Marine Surveyors',
      'Able Seamen & Ratings',
    ],
    clientTypes: ['Shipowners & managers', 'Ports & terminals', 'Shipyards & repair yards', 'Offshore vessel operators'],
    differentiators: [
      'STCW-certified maritime professionals',
      'Flag-state compliance handled end to end',
      'Global crew management & deployment',
      '24/7 operational support',
    ],
    faq: [
      {
        q: 'Are your seafarers STCW certified?',
        a: 'Yes. Every officer, engineer and rating we deploy holds valid STCW 2010 (Manila-amended) certification, and we operate to MLC 2006 standards. Credentials are screened and tracked continuously.',
      },
      {
        q: 'Can you manage flag-state compliance and crew changes?',
        a: 'We handle flag-state compliance, documentation and crew-change logistics as part of the service, so vessels stay compliant and crew rotations run on schedule.',
      },
      {
        q: 'What maritime roles do you cover?',
        a: 'Masters and deck officers, marine engineers, shipyard project managers, port and terminal operators, marine surveyors, and able seamen and ratings — across vessel types and port environments.',
      },
      {
        q: 'Do you cover payroll and onboarding too?',
        a: 'Yes — Confair is one connected partner from vacancy to payroll. Recruitment, compliance, onboarding, crew management and payroll run through a single partnership.',
      },
    ],
    metaTitle: 'Maritime Crewing & Workforce Solutions | STCW Certified',
    metaDescription:
      'Confair Maritime supplies STCW-certified officers, engineers and crew to shipowners, ports and shipyards — crewing, flag-state compliance and payroll in one partner, with 24/7 support.',
  },
  offshore: {
    slug: 'offshore',
    name: 'Confair Offshore',
    shortName: 'Offshore Energy',
    eyebrow: 'Offshore Energy Workforce Solutions',
    heroHeadline: 'Offshore energy workforce — from vacancy to payroll',
    heroSub:
      'BOSIET-, HUET- and GWO-certified professionals for oil, gas and offshore wind — mobilised fast, fully compliant, one partner from sourcing to payroll.',
    intro:
      'We deliver experienced offshore energy professionals for drilling, production, construction and maintenance across oil, gas and renewables. Our specialists are trained to the highest HSE standards and hold all required offshore certifications including BOSIET, HUET and GWO. ' +
      ONE_PARTNER,
    certifications: ['BOSIET', 'HUET', 'GWO certified', 'Strict HSE compliance'],
    roles: [
      'Project Engineers & Managers',
      'Drilling Engineers & Supervisors',
      'Offshore Wind Technicians (GWO certified)',
      'Maintenance & Inspection Engineers',
      'Production Technicians',
      'HSE Officers & Advisors',
    ],
    clientTypes: ['Oil & gas operators', 'Offshore wind developers', 'EPC & drilling contractors', 'Energy service providers'],
    differentiators: [
      'BOSIET, HUET & GWO certified offshore professionals',
      'Oil & gas plus offshore wind / renewables',
      'Strict HSE compliance',
      'Global mobilisation & rapid deployment',
    ],
    faq: [
      {
        q: 'What offshore safety certifications do your people hold?',
        a: 'Our offshore professionals hold BOSIET, HUET and GWO certifications as required for the role, and work to strict HSE standards. We verify and track every certificate through its validity period.',
      },
      {
        q: 'Do you cover both oil & gas and offshore wind?',
        a: 'Yes — we deploy across traditional energy (oil & gas) and renewables (offshore wind), from drilling and production to construction, maintenance and inspection.',
      },
      {
        q: 'How fast can you mobilise an offshore team?',
        a: 'We mobilise globally at short notice because sourcing, certification checks and HSE compliance run continuously — so valid, project-ready teams are available when the schedule demands.',
      },
      {
        q: 'Is compliance and payroll included?',
        a: 'Yes. Confair is one connected partner from vacancy to payroll — recruitment, HSE compliance, onboarding, workforce management and payroll are delivered through a single partnership.',
      },
    ],
    metaTitle: 'Offshore Energy Workforce Solutions | BOSIET, HUET & GWO',
    metaDescription:
      'Confair Offshore supplies BOSIET-, HUET- and GWO-certified professionals for oil, gas and offshore wind — recruitment, HSE compliance and payroll in one partner, mobilised globally at short notice.',
  },
};

export const VERTICAL_SLUGS = Object.keys(VERTICALS) as VerticalSlug[];
