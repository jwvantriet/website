'use server';

import { headers } from 'next/headers';

// Step 1 — request a one-time code.
export type StartState =
  | { status: 'idle' }
  | { status: 'sent'; challengeId: string; email: string }
  | { status: 'error'; message: string };

// Step 2 — verify the code and record the signature.
export type VerifyState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string; attemptsLeft?: number };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The client's IP + user-agent, read from the browser→website request so we
 * can forward them to confair-api for the signature's audit trail (the API is
 * called server-to-server, so it would otherwise only see the website's IP).
 */
function clientMeta() {
  const h = headers();
  const ip = (h.get('x-forwarded-for') || '').split(',')[0]?.trim() || '';
  const userAgent = h.get('user-agent') || '';
  return { ip, userAgent };
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body?.error ?? '';
  } catch {
    return '';
  }
}

/**
 * Step 1: the signer submits their details and we ask confair-api to email
 * them a one-time code. Nothing is signed yet.
 */
export async function startSignature(
  token: string,
  _prev: StartState,
  formData: FormData,
): Promise<StartState> {
  const name = String(formData.get('name') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const note = String(formData.get('note') || '').trim();
  const consent = formData.get('consent');

  if (!name || !email) {
    return { status: 'error', message: 'Your name and business email are required.' };
  }
  if (!EMAIL_RE.test(email)) {
    return { status: 'error', message: 'Please enter a valid business email address.' };
  }
  if (!consent) {
    return { status: 'error', message: 'Please confirm you are authorised to accept these terms.' };
  }

  const apiUrl = process.env.CONFAIR_API_URL;
  if (!apiUrl) {
    return { status: 'error', message: 'Online signing is temporarily unavailable. Please email us instead.' };
  }

  try {
    const { ip, userAgent } = clientMeta();
    const res = await fetch(`${apiUrl}/proposal/${encodeURIComponent(token)}/sign/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, title, email, note, ip, userAgent }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const body = (await res.json()) as { challengeId: string; email: string };
      return { status: 'sent', challengeId: body.challengeId, email: body.email || email };
    }
    if (res.status === 409) {
      return { status: 'error', message: 'This proposal has already been accepted.' };
    }
    if (res.status === 410) {
      return { status: 'error', message: 'The validity period of this proposal has ended. Please contact us for updated terms.' };
    }
    if (res.status === 503) {
      return { status: 'error', message: 'Online signing is temporarily unavailable. Please email us and we will confirm your acceptance directly.' };
    }
    return { status: 'error', message: 'Could not send your verification code. Please try again or email us directly.' };
  } catch {
    return { status: 'error', message: 'Could not send your verification code. Please try again or email us directly.' };
  }
}

/**
 * Step 2: verify the one-time code. On success the signature — with its audit
 * trail — is recorded by confair-api.
 */
export async function verifySignature(
  token: string,
  challengeId: string,
  _email: string,
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const code = String(formData.get('code') || '').trim();
  if (!/^\d{6}$/.test(code)) {
    return { status: 'error', message: 'Enter the 6-digit code from your email.' };
  }
  if (!challengeId) {
    return { status: 'error', message: 'Your session expired. Please request a new code.' };
  }

  const apiUrl = process.env.CONFAIR_API_URL;
  if (!apiUrl) {
    return { status: 'error', message: 'Online signing is temporarily unavailable. Please email us instead.' };
  }

  try {
    const { ip, userAgent } = clientMeta();
    const res = await fetch(`${apiUrl}/proposal/${encodeURIComponent(token)}/sign/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, code, ip, userAgent }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return { status: 'success' };
    // A race where the client's side accepted first is still a "yes".
    if (res.status === 409) return { status: 'success' };
    if (res.status === 400) {
      const body = (await res.json().catch(() => ({}))) as { attemptsLeft?: number };
      const left = typeof body.attemptsLeft === 'number' ? body.attemptsLeft : undefined;
      return {
        status: 'error',
        message: left && left > 0 ? `That code isn't correct — ${left} attempt${left === 1 ? '' : 's'} left.` : "That code isn't correct.",
        attemptsLeft: left,
      };
    }
    if (res.status === 429) {
      return { status: 'error', message: 'Too many attempts. Please request a new code.' };
    }
    if (res.status === 410) {
      const err = await readError(res);
      return {
        status: 'error',
        message: err === 'proposal_expired'
          ? 'This proposal is no longer valid. Please contact us for updated terms.'
          : 'Your code has expired. Please request a new one.',
      };
    }
    return { status: 'error', message: 'Could not record your signature. Please try again or email us directly.' };
  } catch {
    return { status: 'error', message: 'Could not record your signature. Please try again or email us directly.' };
  }
}
