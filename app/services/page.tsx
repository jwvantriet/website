import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Users,
  FileSignature,
  ShieldCheck,
  Plane,
  Wallet,
  Layers,
  Zap,
  Eye,
  Repeat,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'One connected partner for safety-critical workforces — recruitment, contracting & EOR, compliance, onboarding, payroll and managed workforce solutions, in a single process.',
};

const services = [
  {
    icon: Users,
    title: 'Recruitment & Search',
    desc: 'Permanent and contract placement of certified professionals across aviation, maritime and offshore energy — the entry point to the relationship, not the whole of it.',
  },
  {
    icon: FileSignature,
    title: 'Contracting & Employer of Record',
    desc: 'We contract and employ the professional, handling multi-country tax, social security and compliant international engagement so you don’t carry the administrative or legal burden.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance & Verification',
    desc: 'Licences, medicals, visas, training and background checks — collected and verified once, then monitored continuously against expiry, so compliance holds up to audit.',
  },
  {
    icon: Plane,
    title: 'Onboarding & Mobilisation',
    desc: 'Digital onboarding orchestrated across every stakeholder, plus travel, visa and joining logistics — so people arrive on site ready, compliant and on time.',
  },
  {
    icon: Wallet,
    title: 'Payroll & Administration',
    desc: 'Roster and operational data become accurate, multi-currency payroll and invoicing — one partner, one invoice, no surprises and no re-keying.',
  },
  {
    icon: Layers,
    title: 'Managed Workforce Solutions',
    desc: 'We run all or part of your workforce programme (MSP / RPO) — crewing entire operations end-to-end, from sourcing through compliance, deployment and payroll.',
    highlight: true,
  },
];

const promises = [
  { icon: Zap, title: 'Find Faster', desc: 'We shorten the time between a workforce need and qualified, certified professionals — with rapid deployment where the operation demands it.' },
  { icon: ShieldCheck, title: 'Verify Once', desc: 'Every credential is collected, verified and stored once, then kept current — eliminating duplicate administration while strengthening compliance.' },
  { icon: Plane, title: 'Deploy With Confidence', desc: 'Contracts, travel, onboarding and mobilisation run through one connected workflow, so people arrive ready and compliant.' },
  { icon: Eye, title: 'Manage Transparently', desc: 'Real-time visibility of every professional throughout the assignment, with payroll that flows from operational reality — not manual re-keying.' },
  { icon: Repeat, title: 'Retain & Redeploy', desc: 'Profiles, compliance history and experience stay with us — so the next assignment starts faster, across projects, countries and sectors.' },
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-yellow text-sm font-semibold uppercase tracking-wider">Our Services</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">
            One Connected Partner, From Vacancy to Payroll
          </h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Most staffing firms hand you a CV and disappear. We run the whole journey — sourcing,
            compliance, onboarding, workforce management and payroll — as one continuous process, so
            your operations stay staffed, compliant and running.
          </p>
        </div>
      </section>

      {/* Service lines */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-cblue text-sm font-semibold uppercase tracking-wider">What We Do</span>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mt-3 mb-4">Our Service Lines</h2>
            <p className="text-navy-500 max-w-2xl mx-auto text-lg">
              Buy any one on its own, or combine them — delivered together on one platform, so nothing
              is entered twice and nothing falls through the cracks.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((s) => (
              <div
                key={s.title}
                className={`rounded-2xl p-8 transition-all duration-300 hover:shadow-lg ${
                  s.highlight
                    ? 'bg-navy text-white shadow-lg'
                    : 'bg-white border border-gray-100 shadow-sm'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${
                    s.highlight ? 'bg-yellow/20' : 'bg-cblue/10'
                  }`}
                >
                  <s.icon className={`w-7 h-7 ${s.highlight ? 'text-yellow' : 'text-cblue'}`} />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className={`text-lg font-bold ${s.highlight ? 'text-white' : 'text-navy'}`}>
                    {s.title}
                  </h3>
                  {s.highlight && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-yellow text-navy px-2 py-0.5 rounded-full">
                      End-to-end
                    </span>
                  )}
                </div>
                <p className={`text-sm leading-relaxed ${s.highlight ? 'text-white/70' : 'text-navy-500'}`}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Five Promises */}
      <section className="py-20 md:py-28 bg-beige">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-cblue text-sm font-semibold uppercase tracking-wider">How We Deliver</span>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mt-3 mb-4">The Five Promises</h2>
            <p className="text-navy-500 max-w-2xl mx-auto text-lg">
              The commitments behind every assignment — from the first vacancy to redeployment.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {promises.map((p, i) => (
              <div key={p.title} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-cblue/10 flex items-center justify-center shrink-0">
                    <p.icon className="w-5 h-5 text-cblue" />
                  </div>
                  <span className="text-2xl font-bold text-yellow">{i + 1}</span>
                </div>
                <h3 className="font-bold text-navy mb-2">{p.title}</h3>
                <p className="text-navy-500 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">Let’s scope your operation</h2>
          <p className="text-navy-500 text-lg mb-8 max-w-2xl mx-auto">
            Tell us what you need to crew, where and by when — we’ll come back with a plan and a clear,
            online quote.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-yellow text-navy px-7 py-3.5 rounded-lg font-bold hover:bg-yellow-600 transition-colors"
            >
              Request Workforce <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/industries"
              className="inline-flex items-center justify-center gap-2 bg-navy text-white px-7 py-3.5 rounded-lg font-bold hover:bg-navy-800 transition-colors"
            >
              Explore Industries
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
