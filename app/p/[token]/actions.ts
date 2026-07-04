'use server';

export type AcceptState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

/**
 * Record the client's acceptance of a tokenised proposal via confair-api.
 * The API is the system of record (DB write + HubSpot + notification); this
 * action only validates the form and relays the result.
 */
export async function acceptProposal(
  token: string,
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const name = String(formData.get('name') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const note = String(formData.get('note') || '').trim();

  if (!name || !email) {
    return { status: 'error', message: 'Your name and business email are required.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Please enter a valid email address.' };
  }

  const apiUrl = process.env.CONFAIR_API_URL;
  if (!apiUrl) {
    return { status: 'error', message: 'Acceptance is temporarily unavailable. Please email us instead.' };
  }

  try {
    const res = await fetch(`${apiUrl}/proposal/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, title, email, note }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { status: 'success' };
    if (res.status === 409) {
      // Someone on the client's side beat them to it — that's still a yes.
      return { status: 'success' };
    }
    if (res.status === 410) {
      return { status: 'error', message: 'The validity period of this proposal has ended. Please contact us for updated terms.' };
    }
    return { status: 'error', message: 'Could not record your acceptance. Please try again or email us directly.' };
  } catch {
    return { status: 'error', message: 'Could not record your acceptance. Please try again or email us directly.' };
  }
}
