import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import HeroSlider from '@/components/HeroSlider';
import { pageMetadata } from '@/lib/seo';
import {
  Plane,
  Ship,
  Fuel,
  Users,
  Globe,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const metadata: Metadata = pageMetadata({
  title: 'Confair Group — Contracting Solutions for Aviation, Maritime & Offshore',
  description:
    'Certified contracting and workforce solutions for safety-critical industries: aviation, maritime, and offshore energy. Global deployment, full regulatory compliance.',
  path: '/',
  absoluteTitle: true,
});

const AVIATION_IMG =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/8b6c02db-e1c5-4b18-b430-178ec319f74c.png';
const MARITIME_IMG =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/40d5203a-e834-4315-87cc-38f761a1d536.png';
const OFFSHORE_IMG =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/e771e609-e88a-478c-8ddc-3c908613be5a.png';

const stats = [
  { value: '15+', label: 'Years of Experience' },
  { value: '3,000+', label: 'Professionals Deployed' },
  { value: '40+', label: 'Countries Served' },
  { value: '99.5%', label: 'Compliance Rate' },
];

const verticals = [
  {
    id: 'aviation',
    icon: Plane,
    title: 'Confair Aviation',
    description:
      'Supporting airline operations, maintenance, and ground services with certified professionals in highly regulated environments.',
    image: AVIATION_IMG,
    color: '#407df1',
    // AA-safe shade for the link text on white; the bright `color` above stays
    // on the icon + chip. See the text-safe tokens in tailwind.config.
    linkClass: 'text-cblue-700',
    cta: 'Explore Aviation',
  },
  {
    id: 'maritime',
    icon: Ship,
    title: 'Confair Maritime',
    description:
      'Ensuring safe and compliant vessel operations with experienced maritime professionals across global fleets and port environments.',
    image: MARITIME_IMG,
    color: '#61bef6',
    linkClass: 'text-accent-maritime',
    cta: 'Explore Maritime',
  },
  {
    id: 'offshore',
    icon: Fuel,
    title: 'Confair Offshore',
    description:
      'Delivering specialized offshore professionals to support energy operations with a strong focus on safety, compliance, and operational continuity.',
    image: OFFSHORE_IMG,
    color: '#fbc134',
    linkClass: 'text-accent-offshore',
    cta: 'Explore Offshore',
  },
];

const whyChoose = [
  {
    icon: ShieldCheck,
    title: 'Regulatory Compliance',
    desc: 'Full compliance with industry-specific regulations and safety standards across all operations.',
  },
  {
    icon: Globe,
    title: 'Global Reach',
    desc: 'Worldwide deployment capabilities with local expertise in over 40 countries.',
  },
  {
    icon: Users,
    title: 'Vetted Professionals',
    desc: 'Rigorously screened and certified professionals, ready for immediate deployment.',
  },
];

export default function Home() {
  return (
    <>
      <HeroSlider />

      <section className="bg-navy py-0 -mt-1">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center py-10 px-4">
                <div className="text-3xl md:text-4xl font-bold text-yellow mb-1">
                  {stat.value}
                </div>
                <div className="text-white/60 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-cblue-700 text-sm font-semibold uppercase tracking-wider">
              Critical Industries We Serve
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mt-3 mb-4">
              Expertise Across Critical Operations Industries
            </h2>
            <p className="text-navy-500 max-w-2xl mx-auto text-lg">
              Confair operates in safety-critical industries where compliance, precision,
              and operational continuity are essential. Each vertical is supported by highly
              skilled professionals with sector-specific expertise.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {verticals.map((v) => (
              <div
                key={v.title}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={v.image}
                    alt={v.title}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${v.color}15` }}
                  >
                    <v.icon className="w-6 h-6" style={{ color: v.color }} />
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-3">{v.title}</h3>
                  <p className="text-navy-500 text-sm leading-relaxed mb-4">
                    {v.description}
                  </p>
                  <Link
                    href={`/industries/${v.id}`}
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold hover:gap-3 transition-all ${v.linkClass}`}
                  >
                    {v.cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-beige">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-cblue-700 text-sm font-semibold uppercase tracking-wider">
                Why Confair
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-navy mt-3 mb-6">
                One Connected Partner, From Vacancy to Payroll
              </h2>
              <p className="text-navy-500 text-lg leading-relaxed mb-8">
                We connect recruitment, compliance, onboarding, workforce management and
                payroll into one partnership — so your operations stay staffed, compliant
                and running, without the administration.
              </p>
              <div className="space-y-6">
                {whyChoose.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cblue/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-6 h-6 text-cblue-700" />
                    </div>
                    <div>
                      <h4 className="font-bold text-navy mb-1">{item.title}</h4>
                      <p className="text-navy-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-navy mb-6">
                  Our Areas of Expertise
                </h3>

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Plane className="w-4 h-4 text-cblue-700" />
                    <span className="text-navy text-sm font-bold tracking-wide">
                      Aviation
                    </span>
                  </div>
                  <div className="flex items-center gap-3 py-2.5 pl-6 border-b border-gray-50">
                    <CheckCircle2 className="w-5 h-5 text-yellow shrink-0" />
                    <span className="text-navy text-sm font-medium">
                      Commercial &amp; Cargo Aviation
                    </span>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Ship className="w-4 h-4 text-lblue" />
                    <span className="text-navy text-sm font-bold tracking-wide">
                      Maritime
                    </span>
                  </div>
                  {[
                    'Maritime Shipping & Logistics',
                    'Port & Terminal Operations',
                    'Shipbuilding & Repair',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 py-2.5 pl-6 border-b border-gray-50 last:border-0"
                    >
                      <CheckCircle2 className="w-5 h-5 text-yellow shrink-0" />
                      <span className="text-navy text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Fuel className="w-4 h-4 text-yellow" />
                    <span className="text-navy text-sm font-bold tracking-wide">
                      Offshore Energy
                    </span>
                  </div>
                  {['Offshore Oil & Gas', 'Renewable Energy (Offshore Wind)'].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 py-2.5 pl-6 border-b border-gray-50 last:border-0"
                    >
                      <CheckCircle2 className="w-5 h-5 text-yellow shrink-0" />
                      <span className="text-navy text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-cblue-700 text-sm font-semibold uppercase tracking-wider">
              Work With Confair
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-navy rounded-2xl p-10 text-white">
              <span className="text-yellow text-sm font-semibold uppercase tracking-wider">
                For Clients
              </span>
              <h3 className="text-2xl md:text-3xl font-bold mt-3 mb-4">
                Need Reliable Workforce Solutions?
              </h3>
              <p className="text-white/60 leading-relaxed mb-6">
                From single specialists to full project teams, we deliver certified
                professionals that ensure compliance, safety, and operational continuity.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-yellow text-navy px-8 py-3.5 rounded-lg font-bold hover:bg-yellow-600 transition-colors min-w-[200px]"
              >
                Request Workforce <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-beige rounded-2xl p-10">
              <span className="text-cblue-700 text-sm font-semibold uppercase tracking-wider">
                For Candidates
              </span>
              <h3 className="text-2xl md:text-3xl font-bold text-navy mt-3 mb-4">
                Looking for Your Next Opportunity?
              </h3>
              <p className="text-navy-500 leading-relaxed mb-6">
                Join our global network and access contract opportunities across aviation,
                maritime, and offshore energy in safety-critical environments.
              </p>
              {/* Was /contact: a candidate pressing "Apply" landed on the client
                  enquiry form instead of the jobs. */}
              <Link
                href="/vacancies"
                className="inline-flex items-center justify-center gap-2 bg-navy text-white px-8 py-3.5 rounded-lg font-bold hover:bg-navy-800 transition-colors min-w-[200px]"
              >
                View open vacancies <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
