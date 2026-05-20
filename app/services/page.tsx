import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Plane,
  Ship,
  Fuel,
  ArrowRight,
  CheckCircle2,
  Wrench,
  Users,
  Clock,
  FileCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Industries & Services',
  description: 'Specialized workforce solutions across aviation, maritime, and offshore energy.',
};

const AVIATION_IMG =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/8b6c02db-e1c5-4b18-b430-178ec319f74c.png';
const MARITIME_IMG =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/40d5203a-e834-4315-87cc-38f761a1d536.png';
const OFFSHORE_IMG =
  'https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/e771e609-e88a-478c-8ddc-3c908613be5a.png';

const services = [
  {
    id: 'aviation',
    icon: Plane,
    title: 'Confair Aviation',
    subtitle: 'Aviation Workforce Solutions',
    color: '#407df1',
    image: AVIATION_IMG,
    description:
      'We provide certified aviation professionals to airlines, MRO facilities, airports, and aviation service providers worldwide. Our aviation specialists are fully licensed and experienced in operating within strict regulatory frameworks including EASA, FAA, and ICAO standards.',
    roles: [
      'Licensed Pilots (EASA & FAA certified)',
      'Licensed Aircraft Engineers (B1/B2)',
      'Cabin Crew & Flight Attendants',
      'Aviation Safety Officers',
      'Ground Handling Specialists',
      'Airport Operations Managers',
      'Quality & Compliance Auditors',
    ],
    features: [
      'EASA & FAA Licensed and Certified Professionals',
      'Rapid deployment within 48 hours',
      'Short and long-term contracts',
      'Full documentation management',
    ],
  },
  {
    id: 'maritime',
    icon: Ship,
    title: 'Confair Maritime',
    subtitle: 'Maritime Workforce Solutions',
    color: '#61bef6',
    image: MARITIME_IMG,
    description:
      'We supply qualified maritime personnel for vessel operations, port services, and shipyard projects across the globe. Our maritime professionals hold valid STCW certifications and are experienced in operating across diverse vessel types and maritime environments.',
    roles: [
      'Masters & Deck Officers (STCW certified)',
      'Marine Engineers',
      'Shipyard Project Managers',
      'Port & Terminal Operators',
      'Marine Surveyors',
      'Able Seamen & Ratings',
    ],
    features: [
      'STCW Certified Maritime Professionals',
      'Flag state compliance',
      'Global Crew Management & Deployment',
      '24/7 operational support',
    ],
  },
  {
    id: 'offshore',
    icon: Fuel,
    title: 'Confair Offshore',
    subtitle: 'Offshore Energy Workforce Solutions',
    color: '#fbc134',
    image: OFFSHORE_IMG,
    description:
      'We deliver experienced offshore energy professionals for drilling, production, construction, and maintenance operations. Our offshore specialists are trained in the highest HSE standards and hold all required certifications for offshore work including BOSIET, HUET, and GWO.',
    roles: [
      'Project Engineers & Managers',
      'Drilling Engineers & Supervisors',
      'Offshore Wind Technicians (GWO certified)',
      'Maintenance & Inspection Engineers',
      'Production Technicians',
      'HSE Officers & Advisors',
    ],
    features: [
      'BOSIET, HUET & GWO Certified Offshore Professionals',
      'Oil & gas + renewables',
      'Strict HSE compliance',
      'Global Mobilization & Rapid Deployment',
    ],
  },
];

const processSteps = [
  { icon: FileCheck, title: 'Requirements Analysis', desc: 'We assess your operational needs, regulatory requirements, and timeline to define the ideal candidate profile.' },
  { icon: Users, title: 'Candidate Selection', desc: 'Our recruiters match pre-vetted, certified professionals from our global talent pool to your specific requirements.' },
  { icon: Wrench, title: 'Compliance & Onboarding', desc: 'We handle all documentation, certifications, and compliance checks to ensure seamless integration.' },
  { icon: Clock, title: 'Deployment & Support', desc: 'Rapid mobilization with ongoing support throughout the contract duration, ensuring operational continuity.' },
];

export default function ServicesPage() {
  return (
    <>
      <section className="bg-[#222c4a] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">Our Services</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">
            Specialized Workforce Solutions
          </h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Three dedicated divisions delivering sector-specific expertise across aviation, maritime, and offshore energy industries.
          </p>
        </div>
      </section>

      {services.map((service, index) => (
        <section
          key={service.id}
          id={service.id}
          className={`py-20 md:py-28 ${index % 2 === 0 ? 'bg-white' : 'bg-[#f2eee7]'} scroll-mt-20`}
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className={index % 2 !== 0 ? 'lg:order-2' : ''}>
                <div
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4"
                  style={{ backgroundColor: `${service.color}15` }}
                >
                  <service.icon className="w-4 h-4" style={{ color: service.color }} />
                  <span className="text-sm font-semibold" style={{ color: service.color }}>
                    {service.subtitle}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-[#222c4a] mb-6">
                  {service.title}
                </h2>
                <p className="text-[#5a6275] text-lg leading-relaxed mb-8">
                  {service.description}
                </p>

                <h4 className="font-bold text-[#222c4a] mb-4">Key Roles We Supply</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {service.roles.map((role) => (
                    <div key={role} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: service.color }} />
                      <span className="text-[#5a6275] text-sm">{role}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  {service.features.map((f) => (
                    <span
                      key={f}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border"
                      style={{
                        color: service.color,
                        borderColor: `${service.color}40`,
                        backgroundColor: `${service.color}08`,
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`rounded-2xl overflow-hidden shadow-lg ${index % 2 !== 0 ? 'lg:order-1' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={service.image} alt={service.title} className="w-full h-80 object-cover" />
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="py-20 md:py-28 bg-[#222c4a]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">How We Work</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-3 mb-4">Our Process</h2>
            <p className="text-white/60 max-w-2xl mx-auto text-lg">
              A streamlined approach to delivering the right professionals for your operations.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#fbc134]/10 flex items-center justify-center mx-auto mb-5 relative">
                  <step.icon className="w-7 h-7 text-[#fbc134]" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#fbc134] text-[#222c4a] text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{step.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f2eee7]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#222c4a] mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-[#5a6275] text-lg mb-8 max-w-2xl mx-auto">
            Whether you need workforce solutions or you&apos;re looking for your next contract
            opportunity, we&apos;re here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-[#fbc134] text-[#222c4a] px-7 py-3.5 rounded-lg font-bold hover:bg-[#e5af2e] transition-colors"
            >
              Contact Us <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center gap-2 bg-[#222c4a] text-white px-7 py-3.5 rounded-lg font-bold hover:bg-[#1a2340] transition-colors"
            >
              Learn About Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
