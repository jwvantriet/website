'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type UploadFormState =
  | { status: 'idle' }
  | { status: 'success'; documentTypeId: number; filename: string }
  | { status: 'error'; documentTypeId: number | null; message: string };

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function safeFilename(name: string | null | undefined): string {
  const fallback = 'document';
  return (name || fallback).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || fallback;
}

export async function submitApplicationDocument(
  _prev: UploadFormState,
  formData: FormData,
): Promise<UploadFormState> {
  const applicationIdRaw = String(formData.get('application_id') || '');
  const documentTypeIdRaw = String(formData.get('document_type_id') || '');
  const sessionToken     = String(formData.get('session_token') || '').trim();

  const applicationId  = /^\d+$/.test(applicationIdRaw) ? Number(applicationIdRaw) : null;
  const documentTypeId = /^\d+$/.test(documentTypeIdRaw) ? Number(documentTypeIdRaw) : null;

  if (!applicationId || !documentTypeId || !sessionToken) {
    return {
      status: 'error',
      documentTypeId,
      message: 'Missing application context — please reload the page and try again.',
    };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', documentTypeId, message: 'Pick a file first.' };
  }
  if (file.size > MAX_BYTES) {
    return { status: 'error', documentTypeId, message: 'That file is over 10 MB. Please upload a smaller version.' };
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return { status: 'error', documentTypeId, message: 'Allowed file types: PDF, Word (.doc/.docx), JPG, PNG.' };
  }

  const supabase = createClient();
  const objectKey = `applications/${applicationId}/${documentTypeId}/${randomUUID()}-${safeFilename(file.name)}`;

  // 1. Upload to Supabase Storage.
  const { error: upErr } = await supabase
    .storage
    .from('vacancy-cvs')
    .upload(objectKey, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
  if (upErr) {
    console.error('[upload-doc] storage upload failed', { message: upErr.message, objectKey });
    return {
      status: 'error',
      documentTypeId,
      message: 'Upload failed. Please try again.',
    };
  }

  // 2. RPC inserts the row, with session-token validation and replace
  //    semantics. If the RPC fails we clean up the orphan upload.
  const { data: docId, error: rpcErr } = await supabase.rpc('submit_application_document', {
    p_application_id:   applicationId,
    p_session_token:    sessionToken,
    p_document_type_id: documentTypeId,
    p_storage_key:      objectKey,
    p_filename:         file.name || objectKey.split('/').pop() || 'document',
    p_mime_type:        file.type || null,
    p_size_bytes:       file.size,
  });

  if (rpcErr || docId == null) {
    console.error('[upload-doc] submit_application_document rpc failed', {
      message: rpcErr?.message,
      code: rpcErr?.code,
      details: rpcErr?.details,
      hint: rpcErr?.hint,
    });
    await supabase.storage.from('vacancy-cvs').remove([objectKey]).catch(() => {});
    const friendly = rpcErr?.message?.includes('session')
      ? 'Your upload link expired. Please open the email link again.'
      : 'Could not record your upload. Please try again.';
    return { status: 'error', documentTypeId, message: friendly };
  }

  // Invalidate the upload page's server cache so router.refresh() on the
  // client side picks up the new slot state and the progress bar +
  // Continue button update. Without this, the dynamic page can still
  // serve a memoised view of the slot list from the same request batch.
  revalidatePath(`/apply/${applicationId}/upload`);

  return {
    status: 'success',
    documentTypeId,
    filename: file.name || 'document',
  };
}
