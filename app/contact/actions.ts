'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ATTRIBUTION_COOKIE, parseAttribution } from '@/lib/attribution';

export type ContactFormState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

type LeadDetails = {
  name: string;
  email: string;
  inquiry_type: 'client' | 'candidate';
  message: string;
  company?: string;
  industry?: string;
};

/**
 * Forward a captured lead to the HubSpot funnel via confair-api, tagged with
 * the visitor's first-touch marketing attribution. Best-effort: the lead is
 * already saved in Supabase, so a CRM hiccup must not break the visitor's
 * success state — we log and move on. No-op until CONFAIR_API_URL +
 * WEBSITE_WEBHOOK_SECRET are configured.
 */
async function forwardLeadToHubSpot(lead: LeadDetails): Promise<void> {
  const apiUrl = process.env.CONFAIR_API_URL;
  const secret = process.env.WEBSITE_WEBHOOK_SECRET;
  if (!apiUrl || !secret) return;

  const attribution = parseAttribution(cookies().get(ATTRIBUTION_COOKIE)?.value) ?? undefined;

  try {
    const res = await fetch(`${apiUrl}/webhooks/website/lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ ...lead, attribution }),
      // Don't let a slow CRM hold the visitor's form submission hostage.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[contact] HubSpot forward failed: ${res.status}`);
    }
  } catch (err) {
    console.error('[contact] HubSpot forward error:', err);
  }
}

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const inquiry_type = String(formData.get('inquiry_type') || 'client').trim();
  const message = String(formData.get('message') || '').trim();
  const company = String(formData.get('company') || '').trim();
  const industry = String(formData.get('industry') || '').trim();
  const field_of_expertise = String(formData.get('field_of_expertise') || '').trim();

  if (!name || !email || !message) {
    return { status: 'error', message: 'Name, email, and message are required.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Please enter a valid email address.' };
  }
  if (inquiry_type !== 'client' && inquiry_type !== 'candidate') {
    return { status: 'error', message: 'Invalid inquiry type.' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('contact_submissions').insert({
    name,
    email,
    company: company || null,
    industry: industry || null,
    inquiry_type,
    field_of_expertise: field_of_expertise || null,
    message,
  });

  if (error) {
    return { status: 'error', message: 'Could not send your message. Please try again or email us directly.' };
  }

  // Feed the marketing → sales funnel. Awaited so it runs before the server
  // action returns, but never affects the result the visitor sees.
  await forwardLeadToHubSpot({
    name,
    email,
    inquiry_type: inquiry_type as 'client' | 'candidate',
    message,
    company: company || undefined,
    industry: industry || undefined,
  });

  return { status: 'success' };
}
