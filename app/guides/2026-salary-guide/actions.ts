'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ATTRIBUTION_COOKIE, parseAttribution } from '@/lib/attribution';

export type GuideFormState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

/**
 * Lead-magnet form: capture the lead in Supabase, feed it into the HubSpot
 * funnel (tagged salary-guide-2026 so pipeline can be attributed to this
 * asset), then the client reveals the guide content.
 *
 * Same best-effort forwarding contract as the contact form: the visitor gets
 * the guide as long as the Supabase capture succeeds — a CRM hiccup never
 * blocks them.
 */
export async function requestGuide(
  _prev: GuideFormState,
  formData: FormData,
): Promise<GuideFormState> {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const company = String(formData.get('company') || '').trim();
  const industry = String(formData.get('industry') || '').trim();

  if (!name || !email || !company) {
    return { status: 'error', message: 'Name, business email, and company are required.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Please enter a valid email address.' };
  }

  const message = 'Requested the 2026 Workforce & Salary Guide.';

  const supabase = createClient();
  const { error } = await supabase.from('contact_submissions').insert({
    name,
    email,
    company,
    industry: industry || null,
    inquiry_type: 'client',
    message,
  });
  if (error) {
    return { status: 'error', message: 'Something went wrong. Please try again or email us directly.' };
  }

  await forwardToFunnel({ name, email, company, industry, message });

  return { status: 'success' };
}

async function forwardToFunnel(lead: {
  name: string;
  email: string;
  company: string;
  industry: string;
  message: string;
}): Promise<void> {
  const apiUrl = process.env.CONFAIR_API_URL;
  const secret = process.env.WEBSITE_WEBHOOK_SECRET;
  if (!apiUrl || !secret) return;

  // First-touch attribution if the visitor arrived via a tagged campaign;
  // otherwise stamp the asset itself so the deal still shows what converted.
  const attribution = parseAttribution(cookies().get(ATTRIBUTION_COOKIE)?.value) ?? {
    utm_medium: 'lead-magnet',
    utm_campaign: 'salary-guide-2026',
    landing_page: '/guides/2026-salary-guide',
  };

  try {
    const res = await fetch(`${apiUrl}/webhooks/website/lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        name: lead.name,
        email: lead.email,
        company: lead.company,
        industry: lead.industry || undefined,
        inquiry_type: 'client',
        message: lead.message,
        attribution,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[salary-guide] funnel forward failed: ${res.status}`);
    }
  } catch (err) {
    console.error('[salary-guide] funnel forward error:', err);
  }
}
