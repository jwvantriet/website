import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import GuideForm from './GuideForm';

export const metadata: Metadata = {
  title: '2026 Workforce & Salary Guide — Aviation, Maritime & Offshore',
  description:
    'Free 2026 salary and day-rate benchmarks across aviation, maritime, and offshore energy — flight crew, licensed engineers, deck and engine officers, ratings, and certified offshore specialists in Europe and the Middle East.',
  openGraph: {
    title: '2026 Workforce & Salary Guide — Aviation, Maritime & Offshore',
    description:
      'Free salary and day-rate benchmarks for 25+ roles across aviation, maritime, and offshore energy.',
    type: 'website',
  },
};

const bullets = [
  'Salary + day-rate ranges for 25+ roles, segmented per vertical',
  'Aviation: flight crew (type-rated captains & FOs), Part-66 engineers, cabin & ground ops',
  'Maritime: deck officers, engine department, ratings, and shore-based roles',
  'Offshore: DPOs, ROV crews, wind technicians, O&G, and HSE',
  'Hiring-market trends to plan your 2026 workforce budget against',
];

export default function SalaryGuidePage() {
  return (
    <>
      <section className="bg-navy py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-yellow text-sm font-semibold uppercase tracking-wider">
            Free Download
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">
            2026 Workforce &amp; Salary Guide
          </h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Benchmark salaries and day rates across aviation, maritime, and offshore energy — from
            type-rated flight crew and licensed engineers to deck officers, ratings, and certified
            offshore specialists — before you plan your next hire.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-5 gap-16">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-navy mb-6">What&apos;s inside</h2>
              <ul className="space-y-4">
                {bullets.map((b) => (
                  <li key={b} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-cblue shrink-0 mt-0.5" />
                    <span className="text-navy-500 leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
              <p className="text-navy-500 text-sm leading-relaxed mt-8">
                Compiled by Confair Group — certified workforce solutions for safety-critical
                industries, from our offices in Utrecht and Dubai.
              </p>
            </div>
            <div className="lg:col-span-3">
              <GuideForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
