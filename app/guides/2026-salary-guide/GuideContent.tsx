import { Plane, Ship, Fuel, TrendingUp } from 'lucide-react';

/**
 * The gated guide content, revealed after the form is submitted.
 *
 * NOTE FOR THE CONFAIR TEAM: all salary/rate figures are indicative European
 * market ranges and must be validated against your own placement data before
 * heavy promotion. Update once a year and re-promote as the new edition.
 */

type Row = { role: string; salary: string; dayRate?: string };

const aviation: Row[] = [
  { role: 'Licensed Engineer B1/B2 (EASA Part-66)', salary: '€70,000 – €95,000', dayRate: '€450 – €650' },
  { role: 'Base Maintenance Engineer', salary: '€55,000 – €75,000', dayRate: '€380 – €520' },
  { role: 'CAMO / Airworthiness Engineer', salary: '€60,000 – €85,000', dayRate: '€400 – €560' },
  { role: 'Ground Operations Supervisor', salary: '€45,000 – €60,000' },
  { role: 'Cabin Crew (experienced)', salary: '€28,000 – €45,000' },
];

const maritime: Row[] = [
  { role: 'Master / Captain (unlimited)', salary: '€90,000 – €130,000' },
  { role: 'Chief Engineer', salary: '€75,000 – €110,000' },
  { role: 'Deck Officer (OOW/Chief Mate)', salary: '€55,000 – €85,000' },
  { role: 'Marine Superintendent', salary: '€70,000 – €95,000', dayRate: '€500 – €700' },
  { role: 'Marine Electrician / ETO', salary: '€50,000 – €70,000', dayRate: '€350 – €480' },
];

const offshore: Row[] = [
  { role: 'Offshore Wind Technician (GWO)', salary: '€48,000 – €70,000', dayRate: '€400 – €600' },
  { role: 'HSE Officer / Advisor', salary: '€60,000 – €85,000', dayRate: '€450 – €600' },
  { role: 'Project Engineer (O&G / renewables)', salary: '€70,000 – €100,000', dayRate: '€550 – €750' },
  { role: 'Rope Access Technician (IRATA L3)', salary: '€55,000 – €75,000', dayRate: '€420 – €580' },
  { role: 'Crane Operator (offshore certified)', salary: '€58,000 – €80,000', dayRate: '€450 – €620' },
];

function SalaryTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 mb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-beige text-navy text-left">
            <th className="px-4 py-3 font-semibold">Role</th>
            <th className="px-4 py-3 font-semibold">Annual salary (EUR)</th>
            <th className="px-4 py-3 font-semibold">Contract day rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.role} className="border-t border-gray-100">
              <td className="px-4 py-3 text-navy font-medium">{r.role}</td>
              <td className="px-4 py-3 text-navy-500">{r.salary}</td>
              <td className="px-4 py-3 text-navy-500">{r.dayRate ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GuideContent() {
  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-3xl font-bold text-navy mb-4">
          2026 Workforce &amp; Salary Guide
        </h2>
        <p className="text-navy-500 leading-relaxed">
          Indicative European market ranges for the most-placed technical roles across aviation,
          maritime and offshore energy, based on current placement activity and market observation.
          Ranges vary with certification level, rotation schedule, and location — for a benchmark
          specific to your operation, talk to our team.
        </p>
      </div>

      <section>
        <h3 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
          <Plane className="w-5 h-5 text-cblue" /> Aviation
        </h3>
        <SalaryTable rows={aviation} />
        <p className="text-navy-500 text-sm leading-relaxed">
          Demand for EASA Part-66 licensed engineers continues to outstrip supply as MRO capacity
          expands. Expect premiums of 10–15% for type ratings on newer fleets.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
          <Ship className="w-5 h-5 text-emerald-600" /> Maritime
        </h3>
        <SalaryTable rows={maritime} />
        <p className="text-navy-500 text-sm leading-relaxed">
          Senior officer shortages persist across European fleets. Compliance-heavy operations
          (tankers, gas) command the top of the range; shortsea sits toward the lower bound.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
          <Fuel className="w-5 h-5 text-yellow-600" /> Offshore Energy
        </h3>
        <SalaryTable rows={offshore} />
        <p className="text-navy-500 text-sm leading-relaxed">
          Offshore wind build-out keeps GWO-certified technicians in structural shortage. Oil &amp;
          gas day rates remain firm, with rotation flexibility now a bigger differentiator than
          headline rate.
        </p>
      </section>

      <section className="bg-beige rounded-2xl p-8">
        <h3 className="text-xl font-bold text-navy mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cblue" /> What this means for hiring in 2026
        </h3>
        <ul className="space-y-2 text-navy-500 text-sm leading-relaxed list-disc pl-5">
          <li>Time-to-hire for licensed and certified roles keeps lengthening — plan requisitions a quarter ahead.</li>
          <li>Contract and secondment models are increasingly used to bridge certification bottlenecks.</li>
          <li>Cross-border deployment (EU ↔ Middle East) is a lever for hard-to-fill rotations — compliance handled correctly is the differentiator.</li>
        </ul>
        <p className="text-navy mt-6 font-medium">
          Need certified professionals against these benchmarks?{' '}
          <a href="/contact?utm_source=salary-guide&utm_medium=lead-magnet&utm_campaign=salary-guide-2026" className="text-cblue hover:underline">
            Talk to Confair →
          </a>
        </p>
      </section>
    </div>
  );
}
