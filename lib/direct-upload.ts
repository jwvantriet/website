'use client';

import { createClient } from '@supabase/supabase-js';
import { safeFilename } from './storage-keys';

/**
 * Upload a form's file straight from the browser to Supabase Storage, then
 * hand the Server Action only the object's key and metadata.
 *
 * Why: a Server Action body is capped (Next.js: 1 MB by default; Vercel
 * Functions: about 4.5 MB whatever Next allows), but the apply form takes a
 * CV up to 5 MB and the upload page a document up to 10 MB. Every file over
 * 1 MB was refused with "Body exceeded 1 MB limit" and the form crashed: 6
 * times from 3 candidates on 2026-10-28 alone. Going around the function is
 * the only way a 10 MB file fits.
 *
 * Nothing new is opened by this. The `vacancy-cvs` bucket already accepts
 * INSERTs from the anon key (the server action uploads with that same key),
 * and the bucket itself enforces the 10 MB limit and the MIME allowlist, so
 * a browser cannot store anything there that the server path would not.
 * The action still checks that the key sits under the prefix this form owns
 * (`isOwnedKey` in lib/storage-keys.ts), so a submission can only point at an object in its
 * own slot.
 */

const BUCKET = 'vacancy-cvs';

let client: ReturnType<typeof createClient> | null = null;
function storage() {
  // Plain anon client, no session: a stale Supabase cookie in the visitor's
  // browser must not stand in for the anon key (see lib/supabase/server.ts).
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client.storage.from(BUCKET);
}

/**
 * Wrap a form action so the file in `field` goes to Storage first. The
 * action then receives, instead of the file:
 *   `<field>_object_key`, `<field>_filename`, `<field>_mime_type`,
 *   `<field>_size_bytes`.
 * A form with no file in `field` passes through unchanged. If the upload
 * fails, `onError` builds the state the form shows; the action is not called.
 */
export function withDirectUpload<S>(
  action: (prev: S, formData: FormData) => Promise<S>,
  opts: {
    field: string;
    /** The key prefix this form owns, e.g. the vacancy slug. */
    prefix: (formData: FormData) => string;
    onError: (message: string, formData: FormData) => S;
  },
): (prev: S, formData: FormData) => Promise<S> {
  return async (prev, formData) => {
    const file = formData.get(opts.field);
    if (!(file instanceof File) || file.size === 0) return action(prev, formData);

    const key = `${opts.prefix(formData)}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
    const { error } = await storage().upload(key, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) {
      // The bucket's own limits answer here (size, type), worded by Storage.
      console.error('[direct-upload] storage upload failed', error.message);
      return opts.onError('Upload failed. Please check the file and try again.', formData);
    }

    // A copy, so a caller holding the original FormData (stale-action
    // recovery reads it to know a file was chosen) still sees the file.
    const next = new FormData();
    formData.forEach((value, name) => {
      if (name !== opts.field) next.append(name, value);
    });
    next.set(`${opts.field}_object_key`, key);
    next.set(`${opts.field}_filename`, file.name || '');
    next.set(`${opts.field}_mime_type`, file.type || '');
    next.set(`${opts.field}_size_bytes`, String(file.size));
    return action(prev, next);
  };
}
