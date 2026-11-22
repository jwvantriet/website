import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Briefcase } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import { createClient } from '@/lib/supabase/server';
import type { Vacancy } from '@/lib/types';
import { AIRLINES, AIRLINE_SLUGS, airlinePath, groupByFleet } from '@/lib/airlines';
import { withoutHidden } from '@/lib/hidden-vacancies';
import { publicEmployerName } from '@/lib/employer';
import { faqSchema, breadcrumbSchema } from '@/lib/structured-data';
import { pageMetadata } from '@/lib/seo';

// Same freshness as the vacancy list: a role closed in Carerix leaves this
// page within a minute of the sync, so it never advertises a filled seat.
export const revalidate = 60;

type Row = Pick<
  Vacancy,
  'id' | 'slug' | 'carerix_id' | 'title' | 'location' | 'employment_type' | 'company_name'
>;

const STEPS = [
  { title: 'Apply', text: 'Pick a role and upload your CV, licence and medical.' },
  {
    title: 'Checks',
    text: 'We verify licence, type rating, recency and background before your file goes to the airline.',
  },
  { title: 'Onboarding', text: 'Contract, documents and travel arranged in one portal.' },
  { title: 'Pay', text: 'Your contract and monthly pay run through Confair.' },
];

export function generateStaticParams() {
  return AIRLINE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const airline = AIRLINES[params.slug];
  if (!airline) return {};
  return pageMetadata({
    title: airline.metaTitle,
    description: airline.metaDescription,
    path: airlinePath(airline.slug),
  });
}

function RoleList({ vacancies }: { vacancies: Row[] }) {
  return (
    <ul className="divide-y divide-gray-200 border-b border-gray-200">
      {vacancies.map((v) => (
        <li key={v.id}>
          <Link
            href={`/vacancies/${v.slug}`}
            className="group flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
          >
            <span className="font-semibold text-navy group-hover:text-cblue-700">{v.title}</span>
            <span className="shrink-0 text-sm text-navy-500">
              {[publicEmployerName(v.company_name), v.employment_type].filter(Boolean).join(' · ')}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function AirlinePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const airline = AIRLINES[params.slug];
  if (!airline) notFound();

  const path = airlinePath(airline.slug);
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vacancies')
    .select('id, slug, carerix_id, title, location, employment_type, company_name')
    .eq('is_active', true)
    .ilike('company_name', `${airline.companyPrefix}%`)
    .order('title', { ascending: true });

  const vacancies = withoutHidden((data as Row[] | null) ?? []);
  const { groups, other } = groupByFleet(airline, vacancies);
  const count = vacancies.length;

  return (
    <>
      <JsonLd data={faqSchema(airline.faq)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Vacancies', path: '/vacancies' },
          { name: airline.name, path },
        ])}
      />

      {/* Hero */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 pb-14 pt-8 md:pb-20">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-navy-500">
            <Link href="/" className="hover:text-cblue-700">Home</Link>
            <span className="px-2">/</span>
            <Link href="/vacancies" className="hover:text-cblue-700">Vacancies</Link>
            <span className="px-2">/</span>
            <span className="text-navy">{airline.name}</span>
          </nav>

          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-cblue-700">
                Airline partner
              </span>
              <h1 className="mt-3 text-3xl font-bold leading-tight text-navy md:text-5xl">
                {airline.h1}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-500">{airline.intro}</p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <a
                  href="#jobs"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow px-7 py-3.5 font-bold text-navy transition-colors hover:bg-yellow-600"
                >
                  {count > 0
                    ? `See ${count} open ${count === 1 ? 'job' : 'jobs'}`
                    : `See ${airline.name} jobs`}{' '}
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#faq" className="font-semibold text-cblue-700 hover:underline">
                  Questions about flying for {airline.name}
                </a>
              </div>
            </div>
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl">
              <Image
                src={airline.hero.src}
                alt={airline.hero.alt}
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Open contracts */}
      <section id="jobs" className="scroll-mt-24 bg-gray-50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <span className="text-sm font-semibold uppercase tracking-wider text-cblue-700">
            Open contracts
          </span>
          <h2 className="mt-3 text-2xl font-bold text-navy md:text-3xl">
            {airline.name} pilot, engineer and loadmaster jobs
          </h2>

          {error ? (
            <p className="mt-8 text-red-600">
              Could not load the open jobs. Please try again later, or see{' '}
              <Link href="/vacancies" className="underline">all vacancies</Link>.
            </p>
          ) : count === 0 ? (
            <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-navy-200" />
              <p className="mt-4 font-semibold text-navy">
                There are no open {airline.name} contracts right now.
              </p>
              <p className="mt-2 text-navy-500">New roles appear here as soon as they open.</p>
              <Link
                href="/vacancies"
                className="mt-6 inline-flex items-center gap-2 font-semibold text-cblue-700 hover:underline"
              >
                See all open vacancies <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-10 lg:grid-cols-2">
              {groups.map((g) => (
                <div key={g.name}>
                  <h3 className="border-b-2 border-navy pb-3 text-lg font-bold text-navy">{g.name}</h3>
                  <RoleList vacancies={g.vacancies} />
                </div>
              ))}
              {other.length > 0 && (
                <div>
                  <h3 className="border-b-2 border-navy pb-3 text-lg font-bold text-navy">
                    Other roles
                  </h3>
                  <RoleList vacancies={other} />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* How applying works */}
      <section className="bg-beige py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <span className="text-sm font-semibold uppercase tracking-wider text-cblue-700">
            Applying through Confair
          </span>
          <h2 className="mt-3 text-2xl font-bold text-navy md:text-3xl">
            From application to first flight
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-xl bg-white p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ — open by default: this is the content the searches ask for. */}
      <section id="faq" className="scroll-mt-24 bg-white py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold text-navy md:text-3xl">
            Flying and working for {airline.name}
          </h2>
          <dl className="mt-8 divide-y divide-gray-200">
            {airline.faq.map((f) => (
              <div key={f.q} className="py-6 first:pt-0">
                <dt className="text-lg font-semibold text-navy">{f.q}</dt>
                <dd className="mt-2 leading-relaxed text-navy-500">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="bg-navy py-14">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Ready to apply for a contract with {airline.name}?
          </h2>
          <a
            href="#jobs"
            className="inline-flex items-center gap-2 rounded-lg bg-yellow px-7 py-3.5 font-bold text-navy transition-colors hover:bg-yellow-600"
          >
            See open jobs <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </>
  );
}
