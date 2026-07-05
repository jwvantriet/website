import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchSignature } from '../fetch';
import PrintButton from './PrintButton';

// Always live — a certificate only exists once the proposal is signed.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Certificate of Electronic Signature',
  // Private, tokenised document — keep it out of every index.
  robots: { index: false, follow: false },
};

function formatUtc(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  })} UTC`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-gray-100 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wider text-navy-500">{label}</dt>
      <dd className="text-sm text-navy">{children}</dd>
    </div>
  );
}

export default async function CertificatePage({ params }: { params: { token: string } }) {
  const sig = await fetchSignature(params.token);
  if (!sig) notFound();

  const methodLabel =
    sig.method === 'email_otp' ? 'Email one-time passcode (verified)' : sig.method || 'Electronic acceptance';

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 print:py-0">
      <div className="print-exact rounded-2xl border border-gray-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none md:p-12">
        {/* Header — navy band so the reversed logo reads on print + screen */}
        <div className="-mx-8 -mt-8 rounded-t-2xl border-b-4 border-yellow bg-navy px-8 py-8 md:-mx-12 md:-mt-12 md:px-12 print:rounded-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo_confair-group_diap.png" alt="Confair Group" className="h-10 w-auto" />
          <h1 className="mt-4 text-2xl font-bold text-white">Certificate of Electronic Signature</h1>
          <p className="mt-1 text-sm text-white/70">
            Confirms acceptance of a Confair commercial proposal by verified electronic signature.
          </p>
        </div>

        {/* Proposal */}
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-cblue-700">Proposal</h2>
          <dl>
            <Row label="Title">{sig.title}</Row>
            <Row label="Client">{sig.client_name}</Row>
            {sig.reference && <Row label="Reference">{sig.reference}</Row>}
          </dl>
        </section>

        {/* Signatory */}
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-cblue-700">Signatory</h2>
          <dl>
            <Row label="Name">{sig.signer.name}</Row>
            {sig.signer.title && <Row label="Job title">{sig.signer.title}</Row>}
            {sig.signer.email && <Row label="Email">{sig.signer.email}</Row>}
          </dl>
        </section>

        {/* Signature */}
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-cblue-700">Signature record</h2>
          <dl>
            <Row label="Signed at">{formatUtc(sig.signed_at)}</Row>
            <Row label="Verification">{methodLabel}</Row>
            {sig.ip && <Row label="Signer IP address">{sig.ip}</Row>}
            {sig.content_sha256 && (
              <Row label="Document hash">
                <code className="break-all font-mono text-xs text-navy-500">SHA-256 · {sig.content_sha256}</code>
              </Row>
            )}
          </dl>
        </section>

        {/* Attestation */}
        <p className="mt-8 rounded-lg bg-beige p-4 text-xs leading-relaxed text-navy-500">
          The signatory confirmed control of the email address above by entering a one-time passcode
          before acceptance was recorded. This certificate, together with the timestamp, IP address
          and document hash shown, forms the audit trail evidencing who accepted the proposal and the
          exact content agreed. The document hash lets either party verify the accepted content has
          not been altered.
        </p>

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-xs text-navy-500/70">Confair Group — Utrecht, The Netherlands · Dubai, UAE</p>
          <div className="flex items-center gap-3 print:hidden">
            <a
              href={`/p/${params.token}/certificate.pdf`}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow px-6 py-3 text-sm font-bold text-navy transition-colors hover:bg-yellow-600"
            >
              Download PDF
            </a>
            <PrintButton />
          </div>
        </div>
      </div>
    </main>
  );
}
