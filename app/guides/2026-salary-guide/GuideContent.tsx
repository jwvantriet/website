import { Plane, Ship, Fuel, TrendingUp } from 'lucide-react';

/**
 * The gated guide content, revealed after the form is submitted.
 *
 * Role segments mirror what Confair actually places (see the live vacancy
 * board): aviation spans flight crew as well as engineering; maritime runs
 * from ratings to senior officers plus shore-based roles; offshore covers
 * marine/subsea, wind, and oil & gas.
 *
 * NOTE FOR THE CONFAIR TEAM: all salary/rate figures are indicative European
 * market ranges and must be validated against your own placement data before
 * heavy promotion. Update once a year and re-promote as the new edition.
 */

type Row = { role: string; salary: string; dayRate?: string };
type Segment = { name: string; rows: Row[] };

const aviation: Segment[] = [
  {
    name: 'Flight Crew',
    rows: [
      { role: 'Captain — widebody, type rated (B747 / B777)', salary: '€140,000 – €200,000' },
      { role: 'Captain — narrowbody, type rated (A320 family)', salary: '€110,000 – €165,000' },
      { role: 'First Officer — widebody (B747 / B777)', salary: '€85,000 – €130,000' },
      { role: 'First Officer — narrowbody (A320 family)', salary: '€65,000 – €105,000' },
      { role: 'Flying Loadmaster', salary: '€50,000 – €75,000' },
    ],
  },
  {
    name: 'Engineering & Maintenance',
    rows: [
      { role: 'Licensed Engineer B1/B2 (EASA Part-66, typed)', salary: '€70,000 – €95,000', dayRate: '€450 – €650' },
      { role: 'Flight Mechanic — line maintenance', salary: '€58,000 – €78,000', dayRate: '€400 – €550' },
      { role: 'CAMO / Airworthiness Engineer', salary: '€60,000 – €85,000', dayRate: '€400 – €560' },
    ],
  },
  {
    name: 'Cabin & Ground Operations',
    rows: [
      { role: 'Cabin Crew (experienced)', salary: '€28,000 – €45,000' },
      { role: 'Ground Operations Supervisor', salary: '€45,000 – €60,000' },
      { role: 'Quality & Compliance Auditor', salary: '€55,000 – €75,000' },
    ],
  },
];

const maritime: Segment[] = [
  {
    name: 'Deck Officers',
    rows: [
      { role: 'Master / Captain (unlimited)', salary: '€90,000 – €130,000' },
      { role: 'Chief Officer', salary: '€65,000 – €95,000' },
      { role: 'Deck Officer (OOW)', salary: '€50,000 – €75,000' },
    ],
  },
  {
    name: 'Engine Department',
    rows: [
      { role: 'Chief Engineer', salary: '€75,000 – €110,000' },
      { role: 'Second Engineer', salary: '€55,000 – €80,000' },
      { role: 'Marine Electrician / ETO', salary: '€50,000 – €70,000', dayRate: '€350 – €480' },
    ],
  },
  {
    name: 'Ratings & Shore-Based',
    rows: [
      { role: 'Able Seaman (AB)', salary: '€32,000 – €48,000' },
      { role: 'Marine Superintendent / Surveyor', salary: '€65,000 – €95,000', dayRate: '€500 – €700' },
      { role: 'Shipyard Project Manager', salary: '€70,000 – €100,000' },
    ],
  },
];

const offshore: Segment[] = [
  {
    name: 'Marine & Subsea',
    rows: [
      { role: 'Dynamic Positioning Officer (DPO)', salary: '€65,000 – €95,000', dayRate: '€450 – €650' },
      { role: 'ROV Pilot / Technician', salary: '€60,000 – €90,000', dayRate: '€400 – €600' },
    ],
  },
  {
    name: 'Wind & Oil / Gas',
    rows: [
      { role: 'Wind Turbine Technician (GWO)', salary: '€48,000 – €70,000', dayRate: '€400 – €600' },
      { role: 'Drilling Supervisor', salary: '€90,000 – €130,000', dayRate: '€700 – €950' },
      { role: 'Production Technician', salary: '€55,000 – €80,000', dayRate: '€420 – €580' },
    ],
  },
  {
    name: 'HSE & Project',
    rows: [
      { role: 'HSE Officer / Advisor', salary: '€60,000 – €85,000', dayRate: '€450 – €600' },
      { role: 'Project Engineer (O&G / renewables)', salary: '€70,000 – €100,000', dayRate: '€550 – €750' },
    ],
  },
];

function SegmentTables({ segments }: { segments: Segment[] }) {
  return (
    <div className="space-y-6 mb-4">
      {segments.map((segment) => (
        <div key={segment.name}>
          <h4 className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-2">
            {segment.name}
          </h4>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-beige text-navy text-left">
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Annual salary (EUR)</th>
                  <th className="px-4 py-3 font-semibold">Contract day rate</th>
                </tr>
              </thead>
              <tbody>
                {segment.rows.map((r) => (
                  <tr key={r.role} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-navy font-medium">{r.role}</td>
                    <td className="px-4 py-3 text-navy-500">{r.salary}</td>
                    <td className="px-4 py-3 text-navy-500">{r.dayRate ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
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
          Indicative European market ranges for the roles Confair places across aviation, maritime
          and offshore energy — from flight deck and engine room to hangar floor and turbine
          nacelle. Ranges vary with certification level, type rating, rotation schedule, and
          location; for a benchmark specific to your operation, talk to our team.
        </p>
      </div>

      <section>
        <h3 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
          <Plane className="w-5 h-5 text-cblue" /> Aviation
        </h3>
        <SegmentTables segments={aviation} />
        <p className="text-navy-500 text-sm leading-relaxed">
          Type-rated captains on widebody freighters and EASA Part-66 licensed engineers are the
          tightest segments. Current type ratings command premiums of 10–15%; non-type-rated (NTR)
          flight deck entry points trade salary for the rating investment.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
          <Ship className="w-5 h-5 text-emerald-600" /> Maritime
        </h3>
        <SegmentTables segments={maritime} />
        <p className="text-navy-500 text-sm leading-relaxed">
          Senior officer shortages persist across European fleets, from Chief Officers ready to
          step up to experienced Chief Engineers. Compliance-heavy operations (tankers, gas)
          command the top of the range; shortsea sits toward the lower bound.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
          <Fuel className="w-5 h-5 text-yellow-600" /> Offshore Energy
        </h3>
        <SegmentTables segments={offshore} />
        <p className="text-navy-500 text-sm leading-relaxed">
          DP-certified officers and ROV crews move fluidly between wind construction and O&amp;G
          campaigns, so both markets set their rates. GWO-certified technicians remain in
          structural shortage as the wind build-out accelerates.
        </p>
      </section>

      <section className="bg-beige rounded-2xl p-8">
        <h3 className="text-xl font-bold text-navy mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cblue" /> What this means for hiring in 2026
        </h3>
        <ul className="space-y-2 text-navy-500 text-sm leading-relaxed list-disc pl-5">
          <li>Time-to-hire for licensed, type-rated and certified roles keeps lengthening — plan requisitions a quarter ahead.</li>
          <li>Contract and secondment models are increasingly used to bridge certification bottlenecks, from flight deck to engine room.</li>
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
