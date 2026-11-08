import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import ContactForm from '@/app/contact/ContactForm';
import SectorContactCard from '@/components/SectorContactCard';
import JsonLd from '@/components/JsonLd';
import { VERTICALS } from '@/lib/verticals';
import type { TalentPoolSector } from '@/lib/hidden-vacancies';
import { breadcrumbSchema } from '@/lib/structured-data';
import { pageMetadata } from '@/lib/seo';

/**
 * Talent pool sign-up for a sector Confair is entering (maritime, offshore).
 *
 * Replaces the placeholder vacancies those sectors used to carry
 * (lib/hidden-vacancies.ts): a candidate still has somewhere to go, and every
 * sign-up is a number we can honestly put in front of a buyer ("we have N DPOs
 * registered") before the first placement. Submissions land in
 * contact_submissions as inquiry_type 'candidate' with the sector as industry.
 */
const SECTORS: TalentPoolSector[] = ['maritime', 'offshore'];

const COPY: Record<TalentPoolSector, { metaTitle: string; title: string; lead: string; certs: string }> = {
  maritime: {
    metaTitle: 'Maritime Talent Pool — Officers, Engineers & Ratings',
    title: 'Join the Confair Maritime talent pool',
    lead: 'We are building Confair Maritime in 2026. Register now and you are among the first we call when a ship owner or manager asks us for crew.',
    certs: 'your rank, STCW certificates and their expiry dates, vessel types, and when you are available',
  },
  offshore: {
    metaTitle: 'Offshore Talent Pool — DPO, ROV, GWO & Helicopter Crew',
    title: 'Join the Confair Offshore talent pool',
    lead: 'We are building Confair Offshore in 2026. Register now and you are among the first we call when an offshore operator or contractor asks us for crew.',
    certs: 'your role, offshore certificates (BOSIET/FOET, HUET, GWO, medical) and their expiry dates, and when you are available',
  },
};

export function generateStaticParams() {
  return SECTORS.map((sector) => ({ sector }));
}

export async function generateMetadata(props: { params: Promise<{ sector: string }> }): Promise<Metadata> {
  const { sector } = await props.params;
  if (!SECTORS.includes(sector as TalentPoolSector)) return {};
  const s = sector as TalentPoolSector;
  const v = VERTICALS[s];
  return pageMetadata({
    title: COPY[s].metaTitle,
    description: `${COPY[s].lead} Roles: ${v.roles.join(', ')}.`,
    path: `/talent-pool/${s}`,
  });
}

export default async function TalentPoolPage(props: {
  params: Promise<{ sector: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { sector } = await props.params;
  const { role } = await props.searchParams;
  if (!SECTORS.includes(sector as TalentPoolSector)) notFound();
  const s = sector as TalentPoolSector;
  const v = VERTICALS[s];
  const copy = COPY[s];

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: v.shortName, path: `/industries/${s}` },
          { name: 'Talent pool', path: `/talent-pool/${s}` },
        ])}
      />
      <section className="bg-navy py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-white/70">
            <Link href="/" className="hover:text-yellow">Home</Link>
            <span className="px-2">/</span>
            <Link href={`/industries/${s}`} className="hover:text-yellow">{v.shortName}</Link>
            <span className="px-2">/</span>
            <span className="text-white">Talent pool</span>
          </nav>
          <div className="max-w-3xl">
            <span className="text-yellow text-sm font-semibold uppercase tracking-wider">{v.eyebrow}</span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6 leading-tight">{copy.title}</h1>
            <p className="text-white/70 text-lg leading-relaxed">{copy.lead}</p>
            <p className="text-white/70 text-lg leading-relaxed mt-4">
              We have no open {v.shortName.toLowerCase()} positions today, and we will not pretend
              otherwise. When we do, they are posted on our{' '}
              <Link href="/vacancies" className="text-yellow underline underline-offset-2">vacancies page</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ContactForm
              lockedIndustry={s}
              candidateOnly
              defaultField={role}
              heading="Register your profile"
              intro={`Tell us ${copy.certs}.`}
              successText="You are registered. We will contact you when we have a role that fits."
            />
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-navy text-lg mb-4">{v.rolesHeading}</h2>
              <ul className="space-y-3">
                {v.roles.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-navy-500">
                    <CheckCircle2 className="w-4 h-4 text-yellow shrink-0 mt-0.5" /> {r}
                  </li>
                ))}
              </ul>
            </div>
            <SectorContactCard />
            <Link
              href={`/industries/${s}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-cblue-700 hover:gap-3 transition-all"
            >
              About Confair {v.shortName} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
