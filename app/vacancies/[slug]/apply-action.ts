'use server';

import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';

export type ApplyFormState =
  | { status: 'idle' }
  | { status: 'success' }
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
      return { status: 'error', message: 'Could not upload your CV. Please try again or contact us directly.' };
    }
    cvObjectKey = key;
    cvFilename  = cv.name || null;
    cvMimeType  = cv.type || null;
    cvSizeBytes = cv.size;
  }

  const { error } = await supabase.from('vacancy_applications').insert({
    vacancy_id: vacancyId,
    vacancy_slug: vacancySlug,
    vacancy_title: vacancyTitle,
    vacancy_carerix_id: vacancyCarerixId,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    message,
    cv_object_key: cvObjectKey,
    cv_filename: cvFilename,
    cv_mime_type: cvMimeType,
    cv_size_bytes: cvSizeBytes,
  });

  if (error) {
    // Best-effort cleanup of the orphaned upload.
    if (cvObjectKey) {
      await supabase.storage.from('vacancy-cvs').remove([cvObjectKey]).catch(() => {});
    }
    return { status: 'error', message: 'Could not submit your application. Please try again in a moment.' };
  }

  return { status: 'success' };
}
