import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AcceptPanel from './AcceptPanel';
import { fetchProposal } from './fetch';

// Every visit must see live status (accepted banner, expiry) and register a
// view — never serve this from the static cache.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const proposal = await fetchProposal(params.token);
  return {
    title: proposal ? `${proposal.title} — proposal for ${proposal.client_name}` : 'Proposal',
    // Private, tokenised document — keep it out of every index.
    robots: { index: false, follow: false },
  };
}

function bullets(text: string | undefined): string[] {
  return (text ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 inline-block border-b-[3px] border-yellow pb-1.5 text-xl font-bold text-navy">
      {children}
    </h2>
  );
}

export default async function ProposalPage({ params }: { params: { token: string } }) {
  const proposal = await fetchProposal(params.token);
  if (!proposal) notFound();

  const d = proposal.data;
  const accepted = proposal.status === 'accepted';

  return (
    <>
      {/* Cover */}
      <section className="bg-navy py-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo_confair-group_diap.png" alt="Confair Group" className="h-12 w-auto" />
          <div className="my-6 h-1.5 w-16 bg-yellow" />
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            {d.title}
            <br />
            for {proposal.client_name}
          </h1>
          {d.subtitle && <p className="mt-4 max-w-2xl text-white/70 leading-relaxed">{d.subtitle}</p>}
          <div className="mt-10 space-y-1 text-sm text-white/60">
            {d.preparedFor && (
              <p><span className="font-semibold text-yellow">Prepared for</span> {d.preparedFor}</p>
            )}
            <p><span className="font-semibold text-yellow">Prepared by</span> Confair Group — Utrecht, The Netherlands · Dubai, UAE</p>
            <p>
              {d.date && <><span className="font-semibold text-yellow">Date</span> {d.date} · </>}
              {d.validity && <><span className="font-semibold text-yellow">Validity</span> {d.validity} · </>}
              {proposal.reference && <><span className="font-semibold text-yellow">Reference</span> {proposal.reference}</>}
            </p>
            <p className="font-semibold text-yellow">Commercial in confidence</p>
          </div>
        </div>
      </section>

      {/* Status banners */}
      {accepted && (
        <div className="bg-emerald-50 border-b border-emerald-200">
          <div className="max-w-4xl mx-auto px-6 py-4 text-sm text-emerald-800">
            <span className="font-semibold">Accepted</span>
            {proposal.accepted_by_name && (
              <> by {proposal.accepted_by_name}{proposal.accepted_by_title ? `, ${proposal.accepted_by_title}` : ''}</>
            )}
            {proposal.accepted_at && <> on {new Date(proposal.accepted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</>}
            . Our team will be in touch with the framework agreement.{' '}
            <a href={`/p/${params.token}/certificate`} className="font-semibold underline">
              View signing certificate
            </a>
            .
          </div>
        </div>
      )}
      {!accepted && proposal.expired && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-4xl mx-auto px-6 py-4 text-sm text-amber-800">
            The validity period of this proposal has ended. Please contact us for updated terms — the
            document below is shown for reference.
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12 text-navy-500 leading-relaxed">
        {/* 1 · Requirement */}
        <section>
          <SectionHeading>1 · Your requirement</SectionHeading>
          {d.requirementIntro && <p>{d.requirementIntro}</p>}
          <ul className="my-3 space-y-2">
            {bullets(d.requirementBullets).map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow mt-2.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {d.requirementOutro && <p>{d.requirementOutro}</p>}
        </section>

        {/* 2 · Why Confair */}
        {d.whyBlocks?.length > 0 && (
          <section>
            <SectionHeading>2 · Why Confair</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              {d.whyBlocks.map((b, i) => (
                <div key={i} className="rounded-b-lg border-t-[3px] border-yellow bg-beige/60 p-5">
                  <p className="mb-2 font-semibold text-navy">{b.heading}</p>
                  <p className="text-sm">{b.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3 · Commercial structure */}
        <section>
          <SectionHeading>3 · Commercial structure</SectionHeading>
          {d.commercialIntro && <p>{d.commercialIntro}</p>}
          <div className="my-4 overflow-x-auto rounded-lg border border-navy-100">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="bg-navy p-3 text-left font-semibold text-white">Component</th>
                  {d.columns.map((c, i) => (
                    <th key={i} className="bg-navy p-3 text-right font-semibold text-white">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.rows.map((row, i) => (
                  <tr key={i} className="border-b border-navy-100 last:border-b-0 odd:bg-beige/40">
                    <td className={`p-3 ${row.highlight ? 'font-semibold text-navy' : ''}`}>{row.label}</td>
                    {row.values.map((v, k) => (
                      <td key={k} className={`p-3 text-right ${row.highlight ? 'font-semibold text-navy' : ''}`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {d.commercialFootnote && <p className="text-xs text-navy-400">{d.commercialFootnote}</p>}
          {d.commercialCallout && (
            <div className="mt-4 rounded-r-lg border-l-4 border-yellow bg-beige p-4 text-sm">
              <p>{d.commercialCallout}</p>
            </div>
          )}
        </section>

        {/* 4 · Assumptions */}
        {d.assumptions && (
          <section>
            <SectionHeading>4 · Assumptions & operator-provided items</SectionHeading>
            <p>{d.assumptions}</p>
          </section>
        )}

        {/* 5 · Crew standards */}
        {d.standardsRows?.length > 0 && (
          <section>
            <SectionHeading>5 · Crew standards</SectionHeading>
            <div className="my-4 overflow-x-auto rounded-lg border border-navy-100">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {(['a', 'b', 'c'] as const).map((k) => (
                      <th key={k} className="bg-navy p-3 text-left font-semibold text-white">{d.standardsHeaders[k]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.standardsRows.map((r, i) => (
                    <tr key={i} className="border-b border-navy-100 last:border-b-0 odd:bg-beige/40">
                      <td className="p-3 font-semibold text-navy">{r.a}</td>
                      <td className="p-3">{r.b}</td>
                      <td className="p-3">{r.c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 6 · Timeline */}
        {d.timeline?.length > 0 && (
          <section>
            <SectionHeading>6 · Mobilisation timeline</SectionHeading>
            <div className="my-4 overflow-x-auto rounded-lg border border-navy-100">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {d.timeline.map((r, i) => (
                    <tr key={i} className="border-b border-navy-100 last:border-b-0 odd:bg-beige/40">
                      <td className="p-3">{r.a}</td>
                      <td className="p-3 text-right font-semibold text-navy">{r.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 7 · Next steps */}
        <section>
          <SectionHeading>7 · Next steps</SectionHeading>
          <ul className="my-3 space-y-2">
            {bullets(d.nextSteps).map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow mt-2.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {d.contacts && (
            <div className="mt-4 rounded-r-lg border-l-4 border-yellow bg-beige p-4 text-sm">
              <p><span className="font-semibold text-navy">Your contact:</span> {d.contacts}</p>
            </div>
          )}
        </section>

        {/* Accept */}
        {!accepted && !proposal.expired && <AcceptPanel token={params.token} />}
      </div>
    </>
  );
}
