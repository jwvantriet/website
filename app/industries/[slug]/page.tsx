import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Plane, Ship, Fuel, ShieldCheck, CheckCircle2, ArrowRight, Building2 } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import ContactForm from '@/app/contact/ContactForm';
import { VERTICALS, VERTICAL_SLUGS, type VerticalSlug } from '@/lib/verticals';
import { serviceSchema, faqSchema, breadcrumbSchema } from '@/lib/structured-data';

// Per-vertical icon + hero image + accent (text-safe shade for links on white).
const META: Record<VerticalSlug, { icon: typeof Plane; image: string; accent: string }> = {
  aviation: {
    icon: Plane,
    image: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/8b6c02db-e1c5-4b18-b430-178ec319f74c.png',
    accent: 'text-cblue-700',
  },
  maritime: {
    icon: Ship,
    image: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/40d5203a-e834-4315-87cc-38f761a1d536.png',
    accent: 'text-accent-maritime',
  },
  offshore: {
    icon: Fuel,
    image: 'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/e771e609-e88a-478c-8ddc-3c908613be5a.png',
    accent: 'text-accent-offshore',
  },
};

export function generateStaticParams() {
  return VERTICAL_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const v = VERTICALS[params.slug as VerticalSlug];
  if (!v) return {};
  const path = `/industries/${v.slug}`;
  return {
    title: v.metaTitle,
    description: v.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      title: v.metaTitle,
      description: v.metaDescription,
      type: 'website',
      url: path,
    },
  };
}

export default function VerticalPage({ params }: { params: { slug: string } }) {
  const v = VERTICALS[params.slug as VerticalSlug];
  if (!v) notFound();

  const { icon: Icon, image, accent } = META[v.slug];
  const path = `/industries/${v.slug}`;

  return (
    <>
      <JsonLd
        data={serviceSchema({
          name: v.name,
          description: v.metaDescription,
          path,
          serviceType: `${v.shortName} workforce & staffing solutions`,
        })}
      />
      <JsonLd data={faqSchema(v.faq)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Industries', path: '/industries' },
          { name: v.shortName, path },
        ])}
      />

      {/* Hero */}
      <section className="relative flex min-h-[60vh] items-center overflow-hidden bg-navy">
        <Image
          src={image}
          alt={`${v.name} — ${v.shortName} operations`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-800/90 via-navy/80 to-navy/50" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-white/70">
            <Link href="/" className="hover:text-yellow">Home</Link>
            <span className="px-2">/</span>
            <Link href="/industries" className="hover:text-yellow">Industries</Link>
            <span className="px-2">/</span>
            <span className="text-white">{v.shortName}</span>
          </nav>
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow/30 bg-yellow/15 px-4 py-1.5 text-sm font-semibold text-yellow">
              <Icon className="h-4 w-4" /> {v.eyebrow}
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-white md:text-5xl">
              {v.heroHeadline}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/70">{v.heroSub}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="#request"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow px-7 py-3.5 font-bold text-navy transition-colors hover:bg-yellow-600"
              >
                Request {v.shortName} workforce <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/vacancies"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-7 py-3.5 font-bold text-white transition-colors hover:border-yellow hover:text-yellow"
              >
                View {v.shortName} vacancies
              </Link>
            </div>
            {/* Certifications trust strip */}
            <ul className="mt-8 flex flex-wrap gap-2">
              {v.certifications.map((c) => (
                <li
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-yellow" /> {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Intro + differentiators */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-start gap-16 lg:grid-cols-2">
            <div>
              <span className={`text-sm font-semibold uppercase tracking-wider ${accent}`}>
                Why Confair {v.shortName}
              </span>
              <h2 className="mt-3 text-3xl font-bold text-navy md:text-4xl">
                One connected partner, from vacancy to payroll
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-navy-500">{v.intro}</p>
            </div>
            <div className="space-y-4">
              {v.differentiators.map((d) => (
                <div key={d} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-yellow" />
                  <span className="font-medium text-navy">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Roles + client types */}
      <section className="bg-beige py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-navy md:text-3xl">Key roles we supply</h2>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {v.roles.map((role) => (
                  <div key={role} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-yellow" />
                    <span className="text-sm text-navy-500">{role}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-navy md:text-3xl">Who we work with</h2>
              <div className="mt-6 space-y-3">
                {v.clientTypes.map((c) => (
                  <div key={c} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                    <Building2 className={`h-5 w-5 shrink-0 ${accent}`} />
                    <span className="font-medium text-navy">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold text-navy md:text-4xl">
            {v.shortName} staffing — frequently asked
          </h2>
          <div className="mt-10 space-y-4">
            {v.faq.map((f) => (
              <details key={f.q} className="group rounded-xl border border-gray-200 bg-white p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-navy">
                  {f.q}
                  <ArrowRight className="h-4 w-4 shrink-0 text-navy-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 leading-relaxed text-navy-500">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Lead form */}
      <section id="request" className="scroll-mt-20 bg-navy py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-yellow">
              Request {v.shortName} workforce
            </span>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
              Tell us what you need
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Share your requirement and a Confair {v.shortName.toLowerCase()} specialist will
              come back to you — certified people, compliance and payroll handled end to end.
            </p>
          </div>
          <div className="mt-10">
            <ContactForm lockedIndustry={v.slug} />
          </div>
        </div>
      </section>
    </>
  );
}
