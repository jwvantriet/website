'use server';

import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';

// Fire-and-forget the Carerix push webhook. We don't block the form's
// success state on it — the application is already safely captured in
// Supabase, and confair-api processes the push idempotently. If it fails
// (network, secret mismatch, Carerix unavailable), the row stays at
// carerix_push_status='new' and the agency can retry from the admin page.
async function pushToCarerix(applicationId: number): Promise<void> {
  // Read env vars at call time so a redeploy or a runtime override is
  // picked up correctly (module-level reads happen once per cold start).
  const apiUrl = process.env.CONFAIR_API_URL    || '';
  const secret = process.env.WEBSITE_WEBHOOK_SECRET || '';

  if (!apiUrl || !secret) {
    console.warn('[apply] skipping Carerix push — missing env', {
      applicationId,
      apiUrlPresent: Boolean(apiUrl),
      secretPresent: Boolean(secret),
    });
    return;
  }

  const url = `${apiUrl.replace(/\/+$/, '')}/webhooks/website/vacancy-application`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ application_id: applicationId }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      console.error('[apply] Carerix push webhook returned non-2xx', {
        applicationId, status: res.status, body: text.slice(0, 500),
      });
    } else {
      console.log('[apply] Carerix push webhook fired ok', {
        applicationId, status: res.status, body: text.slice(0, 500),
      });
    }
  } catch (err) {
    console.error('[apply] Carerix push webhook threw', {
      applicationId,
      url,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// Ask confair-api whether a candidate user_profiles row already exists for
// this email. Used by the apply-success modal to pick the right CTA:
//   accountExists=true  → "Sign in to my account"  (login + password they set earlier)
//   accountExists=false → "Create my password"     (the /welcome flow)
//
// Network/secret failures default to `false` (safer fallback: send the
// candidate to /welcome — at worst they get a "this account already
// exists" hint and click through to login).
async function checkAccountExists(email: string): Promise<boolean> {
  const apiUrl = process.env.CONFAIR_API_URL || '';
  const secret = process.env.WEBSITE_WEBHOOK_SECRET || '';
  if (!apiUrl || !secret || !email) return false;
  try {
    const url = `${apiUrl.replace(/\/+$/, '')}/webhooks/website/check-candidate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ email }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.warn('[apply] check-candidate non-2xx', { status: res.status });
      return false;
    }
    const data = (await res.json().catch(() => ({}))) as { accountExists?: boolean };
    return Boolean(data?.accountExists);
  } catch (err) {
    console.warn('[apply] check-candidate threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export type ApplyFormState =
  | { status: 'idle' }
  | {
      status:         'success';
      redirectTo:     string;
      applicationId:  number;
      sessionToken:   string | null;
      accountExists:  boolean;
      email:          string;
    }
  | { status: 'error'; message: string };

const ALLOWED_CV_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 MB — matches storage bucket policy

export async function submitVacancyApplication(
  _prev: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  const vacancyIdRaw         = String(formData.get('vacancy_id') || '');
  const vacancySlug          = String(formData.get('vacancy_slug') || '').trim();
  const vacancyTitle         = String(formData.get('vacancy_title') || '').trim();
  const vacancyCarerixId     = String(formData.get('vacancy_carerix_id') || '').trim() || null;

  const firstName = String(formData.get('first_name') || '').trim();
  const lastName  = String(formData.get('last_name')  || '').trim();
  const email     = String(formData.get('email')      || '').trim();
  const phone     = String(formData.get('phone')      || '').trim() || null;
  const message   = String(formData.get('message')    || '').trim() || null;

  // Basic validation. Keep the messages friendly; the modal renders them.
  if (!firstName || !lastName) return { status: 'error', message: 'Please enter your full name.' };
  if (!email)                  return { status: 'error', message: 'Please enter your email.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'That email address doesn\'t look right.' };
  }
  if (!vacancySlug || !vacancyTitle) {
    return { status: 'error', message: 'Could not identify the vacancy. Please reload the page and try again.' };
  }

  const vacancyId = vacancyIdRaw && /^\d+$/.test(vacancyIdRaw) ? Number(vacancyIdRaw) : null;
  const supabase = createClient();

  // Optional CV upload. We accept it ahead of the row insert so we can write
  // the object key + metadata in one go.
  let cvObjectKey: string | null = null;
  let cvFilename:  string | null = null;
  let cvMimeType:  string | null = null;
  let cvSizeBytes: number | null = null;

  const cv = formData.get('cv');
  if (cv && cv instanceof File && cv.size > 0) {
    if (cv.size > MAX_CV_BYTES) {
      return { status: 'error', message: 'Your CV is too large. Please upload a file under 5 MB.' };
    }
    if (cv.type && !ALLOWED_CV_MIME.has(cv.type)) {
      return { status: 'error', message: 'CV must be a PDF or Word document (.pdf, .doc, .docx).' };
    }

    const safeName = (cv.name || 'cv')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .slice(0, 80) || 'cv';
    const key = `${vacancySlug}/${randomUUID()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from('vacancy-cvs')
      .upload(key, cv, {
        contentType: cv.type || 'application/octet-stream',
        upsert: false,
      });
    if (upErr) {
      console.error('[apply] cv upload failed', { message: upErr.message, key });
      return {
        status: 'error',
        message: 'Could not upload your CV. Please try again or contact us directly.',
      };
    }
    cvObjectKey = key;
    cvFilename  = cv.name || null;
    cvMimeType  = cv.type || null;
    cvSizeBytes = cv.size;
  }

  // Call the SECURITY DEFINER RPC instead of a direct table INSERT. This
  // bypasses PostgREST's RLS policy cache (which kept rejecting valid
  // anon writes after RLS-toggling), runs the insert as the function
  // owner, and gives a strictly-typed surface that anon can only INSERT
  // through — never read/update/delete.
  //
  // The RPC returns jsonb { id, session_token } — the candidate uses
  // the token to continue into the post-apply enrichment flow.
  const { data: rpcResult, error } = await supabase.rpc('submit_vacancy_application', {
    p_vacancy_id:         vacancyId,
    p_vacancy_slug:       vacancySlug,
    p_vacancy_title:      vacancyTitle,
    p_vacancy_carerix_id: vacancyCarerixId,
    p_first_name:         firstName,
    p_last_name:          lastName,
    p_email:              email,
    p_phone:              phone,
    p_message:            message,
    p_cv_object_key:      cvObjectKey,
    p_cv_filename:        cvFilename,
    p_cv_mime_type:       cvMimeType,
    p_cv_size_bytes:      cvSizeBytes,
  });

  // RPC returns jsonb directly. Defensively also handle a one-element
  // array in case PostgREST wraps it (older Supabase / RETURNS TABLE leftover).
  const payload =
    rpcResult && typeof rpcResult === 'object' && !Array.isArray(rpcResult)
      ? (rpcResult as { id?: number; session_token?: string })
      : Array.isArray(rpcResult) && rpcResult.length > 0
      ? (rpcResult[0] as { id?: number; session_token?: string })
      : null;
  const insertedId   = payload?.id ?? null;
  const sessionToken = payload?.session_token ?? null;

  if (error || insertedId == null) {
    console.error('[apply] submit_vacancy_application rpc failed', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    if (cvObjectKey) {
      await supabase.storage.from('vacancy-cvs').remove([cvObjectKey]).catch(() => {});
    }
    return {
      status: 'error',
      message: 'Could not submit your application. Please try again in a moment.',
    };
  }

  // Carerix push + account-existence check happen in parallel — they're
  // independent and we want the modal to render the right CTA as soon
  // as the apply RPC returns. The Carerix push is fire-and-forget for
  // failure handling (`pushToCarerix` swallows non-fatal errors), so
  // we only await both so the action doesn't return before the spawn.
  const [_pushed, accountExists] = await Promise.all([
    pushToCarerix(Number(insertedId)),
    email ? checkAccountExists(email) : Promise.resolve(false),
  ]);
  void _pushed;

  // Hand off to the upload step. If for some reason the session token
  // didn't come back (older DB, RPC error path), we still send the user
  // to the upload page; that page will surface a clear "session not
  // found" message and offer to resend the link by email.
  const redirectTo = sessionToken
    ? `/apply/${insertedId}/upload?token=${encodeURIComponent(sessionToken)}`
    : `/apply/${insertedId}/upload`;

  return {
    status: 'success',
    redirectTo,
    applicationId: Number(insertedId),
    sessionToken,
    accountExists,
    email,
  };
}
