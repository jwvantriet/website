// Server-side fetch of a tokenised proposal from confair-api. Shared by the
// page render and its metadata; the token is the credential, so this never
// runs in the browser.

import { cache } from 'react';

export interface WhyBlock { heading: string; body: string }
export interface Row { label: string; values: string[]; highlight: boolean }
export interface TripleRow { a: string; b: string; c: string }
export interface PairRow { a: string; b: string }

// Mirrors the Proposal document shape authored in the platform's Proposal
// Studio (confair-platform → app/dashboard/marketing/proposals).
export interface ProposalData {
  client: string;
  preparedFor: string;
  title: string;
  subtitle: string;
  reference: string;
  date: string;
  validity: string;
  requirementIntro: string;
  requirementBullets: string;
  requirementOutro: string;
  whyBlocks: WhyBlock[];
  commercialIntro: string;
  columns: string[];
  rows: Row[];
  commercialFootnote: string;
  commercialCallout: string;
  assumptions: string;
  standardsHeaders: TripleRow;
  standardsRows: TripleRow[];
  timeline: PairRow[];
  nextSteps: string;
  contacts: string;
}

export interface PublicProposal {
  title: string;
  client_name: string;
  reference: string | null;
  status: 'published' | 'accepted';
  valid_until: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  accepted_by_title: string | null;
  data: ProposalData;
  expired: boolean;
}

// cache() memoizes per request so generateMetadata and the page body share
// one API call — without it every visit would register two views (and the
// fresh AbortSignal per call defeats Next's built-in fetch memoization).
export const fetchProposal = cache(async (token: string): Promise<PublicProposal | null> => {
  const apiUrl = process.env.CONFAIR_API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/proposal/${encodeURIComponent(token)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { proposal?: PublicProposal };
    return json.proposal ?? null;
  } catch (err) {
    console.error('[proposal] fetch failed:', err);
    return null;
  }
});

export interface ProposalSignature {
  title: string;
  client_name: string;
  reference: string | null;
  signer: { name: string; title: string | null; email: string | null };
  signed_at: string | null;
  ip: string | null;
  user_agent: string | null;
  content_sha256: string | null;
  method: string | null;
}

// The signature attestation behind the Certificate of Electronic Signature.
// Only resolves once a proposal has been signed (accepted); null otherwise.
export const fetchSignature = cache(async (token: string): Promise<ProposalSignature | null> => {
  const apiUrl = process.env.CONFAIR_API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/proposal/${encodeURIComponent(token)}/signature`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { signature?: ProposalSignature };
    return json.signature ?? null;
  } catch (err) {
    console.error('[proposal] signature fetch failed:', err);
    return null;
  }
});
