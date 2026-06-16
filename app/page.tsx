'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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

const heroSlides = [
  {
    image:
      'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/210f479b-845e-4b02-b483-cd5c6632f93e.png',
    alt: 'Offshore platform at sea with helicopter',
  },
  {
    image:
      'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/bc99b82f-113d-45ef-888d-c92551203630.png',
    alt: 'Aviation cockpit with professional pilots',
  },
  {
    image:
      'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/dac9febe-2c04-4a6b-84e8-141c410857b7.png',
    alt: 'Maritime officer on ship bridge',
  },
];

const AVIATION_IMG =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/8b6c02db-e1c5-4b18-b430-178ec319f74c.png';
const MARITIME_IMG =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/40d5203a-e834-4315-87cc-38f761a1d536.png';
const OFFSHORE_IMG =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/e771e609-e88a-478c-8ddc-3c908613be5a.png';

const SLIDE_INTERVAL = 6000;

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

function HeroSlider() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % heroSlides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [next]);

  return (
    // Sized so the stats strip below always sits in the viewport:
    //   - mobile: 70vh keeps the hero visually impactful
    //   - md+: viewport minus ~100px header minus ~150px stats
    //   - capped at 720px on very tall desktops so the headline doesn't drift
    <section className="relative min-h-[70vh] md:min-h-[calc(100svh-250px)] md:max-h-[720px] flex items-center overflow-hidden">
      {heroSlides.map((slide, index) => (
        <div
          key={slide.alt}
          className="absolute inset-0 bg-cover bg-center transition-opacity ease-in-out"
          style={{
            backgroundImage: `url(${slide.image})`,
            opacity: index === current ? 1 : 0,
            transitionDuration: '1500ms',
          }}
          aria-hidden={index !== current}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1a2340]/90 via-[#222c4a]/75 to-[#222c4a]/40" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-[#fbc134]/15 border border-[#fbc134]/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#fbc134] animate-pulse" />
            <span className="text-[#fbc134] text-sm font-semibold">
              Supporting Critical Operations Worldwide
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Contracting Solutions for Aviation, Maritime &amp; Offshore Operations
          </h1>
          <p className="text-white/70 text-lg md:text-xl leading-relaxed mb-8">
            Certified professionals ensuring compliance and operational continuity across
            safety-critical industries.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-[#fbc134] text-[#222c4a] px-7 py-3.5 rounded-lg font-bold hover:bg-[#e5af2e] transition-colors"
            >
              Request Workforce <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white px-7 py-3.5 rounded-lg font-bold hover:border-[#fbc134] hover:text-[#fbc134] transition-colors"
            >
              Explore Industries
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
        {heroSlides.map((slide, index) => (
          <button
            key={slide.alt}
            onClick={() => setCurrent(index)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              index === current ? 'w-10 bg-[#fbc134]' : 'w-4 bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <HeroSlider />

      <section className="bg-[#222c4a] py-0 -mt-1">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center py-10 px-4">
                <div className="text-3xl md:text-4xl font-bold text-[#fbc134] mb-1">
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
            <span className="text-[#407df1] text-sm font-semibold uppercase tracking-wider">
              Critical Industries We Serve
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#222c4a] mt-3 mb-4">
              Expertise Across Critical Operations Industries
            </h2>
            <p className="text-[#5a6275] max-w-2xl mx-auto text-lg">
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
                <div className="h-52 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.image}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${v.color}15` }}
                  >
                    <v.icon className="w-6 h-6" style={{ color: v.color }} />
                  </div>
                  <h3 className="text-xl font-bold text-[#222c4a] mb-3">{v.title}</h3>
                  <p className="text-[#5a6275] text-sm leading-relaxed mb-4">
                    {v.description}
                  </p>
                  <Link
                    href={`/services#${v.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold hover:gap-3 transition-all"
                    style={{ color: v.color }}
                  >
                    {v.cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-[#f2eee7]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#407df1] text-sm font-semibold uppercase tracking-wider">
                Why Confair
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#222c4a] mt-3 mb-6">
                Workforce Solutions for Critical Operations
              </h2>
              <p className="text-[#5a6275] text-lg leading-relaxed mb-8">
                We deliver compliant, reliable workforce solutions to ensure operational
                continuity across aviation, maritime, and offshore environments.
              </p>
              <div className="space-y-6">
                {whyChoose.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#407df1]/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-6 h-6 text-[#407df1]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#222c4a] mb-1">{item.title}</h4>
                      <p className="text-[#5a6275] text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-[#222c4a] mb-6">
                  Our Areas of Expertise
                </h3>

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Plane className="w-4 h-4 text-[#407df1]" />
                    <span className="text-[#222c4a] text-sm font-bold tracking-wide">
                      Aviation
                    </span>
                  </div>
                  <div className="flex items-center gap-3 py-2.5 pl-6 border-b border-gray-50">
                    <CheckCircle2 className="w-5 h-5 text-[#fbc134] shrink-0" />
                    <span className="text-[#222c4a] text-sm font-medium">
                      Commercial &amp; Cargo Aviation
                    </span>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Ship className="w-4 h-4 text-[#61bef6]" />
                    <span className="text-[#222c4a] text-sm font-bold tracking-wide">
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
                      <CheckCircle2 className="w-5 h-5 text-[#fbc134] shrink-0" />
                      <span className="text-[#222c4a] text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Fuel className="w-4 h-4 text-[#fbc134]" />
                    <span className="text-[#222c4a] text-sm font-bold tracking-wide">
                      Offshore Energy
                    </span>
                  </div>
                  {['Offshore Oil & Gas', 'Renewable Energy (Offshore Wind)'].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 py-2.5 pl-6 border-b border-gray-50 last:border-0"
                    >
                      <CheckCircle2 className="w-5 h-5 text-[#fbc134] shrink-0" />
                      <span className="text-[#222c4a] text-sm font-medium">{item}</span>
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
            <span className="text-[#407df1] text-sm font-semibold uppercase tracking-wider">
              Work With Confair
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#222c4a] rounded-2xl p-10 text-white">
              <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">
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
                className="inline-flex items-center justify-center gap-2 bg-[#fbc134] text-[#222c4a] px-8 py-3.5 rounded-lg font-bold hover:bg-[#e5af2e] transition-colors min-w-[200px]"
              >
                Request Workforce <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-[#f2eee7] rounded-2xl p-10">
              <span className="text-[#407df1] text-sm font-semibold uppercase tracking-wider">
                For Candidates
              </span>
              <h3 className="text-2xl md:text-3xl font-bold text-[#222c4a] mt-3 mb-4">
                Looking for Your Next Opportunity?
              </h3>
              <p className="text-[#5a6275] leading-relaxed mb-6">
                Join our global network and access contract opportunities across aviation,
                maritime, and offshore energy in safety-critical environments.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-[#222c4a] text-white px-8 py-3.5 rounded-lg font-bold hover:bg-[#1a2340] transition-colors min-w-[200px]"
              >
                Apply Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
