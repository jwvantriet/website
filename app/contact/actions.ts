'use server';

import { createClient } from '@/lib/supabase/server';

export type ContactFormState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

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

  return { status: 'success' };
}
