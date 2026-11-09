import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import HomeHero from '@/components/HomeHero';
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

// The <title> is what Google shows and ranks on. "Contracting solutions" is a
// phrase nobody searches; the site's traffic is pilots and engineers looking
// for contracts and airlines looking for crew — say that, aviation first, since
// aviation is where the track record is (maritime/offshore are new in 2026).
export const metadata: Metadata = pageMetadata({
  title: 'Contract Pilots & Aircraft Engineers for Airlines | Confair',
  description:
    'Since 1995 Confair places type-rated pilots and Part-66 B1/B2 engineers with airlines worldwide — recruitment, compliance and payroll in one partner.',
  path: '/',
  absoluteTitle: true,
});

// Aviation: Confair's own photo shoot. Maritime/offshore: graded Unsplash
// photos without people (Confair is new to those sectors) — see
// public/images/site/CREDITS.md.
const AVIATION_IMG = '/images/site/confair-pilot-simulator-overhead-panel.jpg';
const MARITIME_IMG =
  '/images/site/maritime-port-heavy-lift.jpg';
const OFFSHORE_IMG =
  '/images/site/offshore-jackup-rig-wind.jpg';

// Aviation figures — the sector these numbers come from. Maritime and
// offshore are new in 2026 (lib/verticals.ts) and have none of their own yet;
// an unlabelled strip next to three sectors read as if they covered all three.
// Founded 1995 (the "15+ years" this said until 2026-11-08 undersold it).
const stats = [
  { value: '30+', label: 'Years in Aviation' },
  { value: '3,000+', label: 'Aviation Professionals Deployed' },
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
      'New in 2026. We are building a pool of STCW-certified officers, engineers and ratings, managed the way we manage airline crews.',
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
      'New in 2026. Offshore helicopter crew, DPOs, ROV pilots and GWO technicians for oil, gas and offshore wind — built on our aviation track record.',
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
      <HomeHero />

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
              Three Safety-Critical Industries, One Way of Working
            </h2>
            <p className="text-navy-500 max-w-2xl mx-auto text-lg">
              Aviation is where we have placed certified crew since 1995. In 2026 we are
              bringing the same way of working — certificates checked and tracked, onboarding
              and payroll from one system — to maritime and offshore energy.
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
              {/* Until 2026-11-08 this card listed shipbuilding, port operations and
                  offshore oil & gas as "areas of expertise" — sectors with no
                  placements yet. Aviation is the track record; the rest is new. */}
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-navy mb-6">Where We Work</h3>

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Plane className="w-4 h-4 text-cblue-700" />
                    <span className="text-navy text-sm font-bold tracking-wide">
                      Aviation — since 1995
                    </span>
                  </div>
                  {[
                    'Flight crew: captains & first officers (TR / NTR)',
                    'Licensed aircraft engineers (Part-66 B1/B2)',
                    'Cabin crew & loadmasters',
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
                    <Ship className="w-4 h-4 text-navy-400" />
                    <Fuel className="w-4 h-4 text-navy-400" />
                    <span className="text-navy text-sm font-bold tracking-wide">
                      Maritime &amp; Offshore — new in 2026
                    </span>
                  </div>
                  <p className="text-navy-500 text-sm leading-relaxed pl-6 mb-3">
                    We are building our first maritime and offshore crew pools. No track record
                    there yet — talk to us, or join the pool.
                  </p>
                  <div className="flex flex-wrap gap-3 pl-6">
                    <Link
                      href="/talent-pool/maritime"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-cblue-700 hover:gap-3 transition-all"
                    >
                      Maritime talent pool <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/talent-pool/offshore"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-cblue-700 hover:gap-3 transition-all"
                    >
                      Offshore talent pool <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
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
            <div className="bg-navy rounded-2xl overflow-hidden text-white">
              <div className="relative h-56">
                <Image
                  src="/images/site/confair-client-meeting.jpg"
                  alt="Confair consultants in a meeting with a client"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-10">
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
            </div>

            <div className="bg-beige rounded-2xl overflow-hidden">
              <div className="relative h-56">
                <Image
                  src="/images/site/confair-video-interview.jpg"
                  alt="A Confair recruiter in a video interview with a candidate"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover object-[50%_40%]"
                />
              </div>
              <div className="p-10">
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
        </div>
      </section>
    </>
  );
}
