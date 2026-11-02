'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isOwnedKey, CARERIX_MAX_FILE_BYTES, FILE_TOO_LARGE_MESSAGE } from '@/lib/storage-keys';

export type UploadFormState =
  | { status: 'idle' }
  | { status: 'success'; documentTypeId: number; filename: string }
  | { status: 'error'; documentTypeId: number | null; message: string };

// Filed in Carerix later, so Carerix's limit, not the bucket's 10 MB.
const MAX_BYTES = CARERIX_MAX_FILE_BYTES;
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

  const supabase = createClient();

  // The document normally arrives already in Storage (lib/direct-upload.ts):
  // a Server Action body is capped at 1 MB, so anything bigger sent through
  // here failed before this code ran. Only its key and metadata come in.
  const uploadedKey = String(formData.get('file_object_key') || '');
  if (uploadedKey) {
    const size = Number(formData.get('file_size_bytes'));
    const mime = String(formData.get('file_mime_type') || '');
    const filename = String(formData.get('file_filename') || '');
    if (!isOwnedKey(uploadedKey, `applications/${applicationId}/${documentTypeId}`)) {
      console.error('[upload-doc] key outside this slot', { key: uploadedKey, applicationId, documentTypeId });
      return { status: 'error', documentTypeId, message: 'Upload failed. Please try again.' };
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
      return { status: 'error', documentTypeId, message: FILE_TOO_LARGE_MESSAGE };
    }
    if (mime && !ALLOWED_MIME.has(mime)) {
      return { status: 'error', documentTypeId, message: 'Allowed file types: PDF, Word (.doc/.docx), JPG, PNG.' };
    }
    return recordDocument(supabase, {
      applicationId, documentTypeId, sessionToken,
      objectKey: uploadedKey, filename: filename || uploadedKey.split('/').pop() || 'document',
      mimeType: mime || null, sizeBytes: size,
    });
  }

  // A page loaded before direct upload still sends the file itself.
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', documentTypeId, message: 'Pick a file first.' };
  }
  if (file.size > MAX_BYTES) {
    return { status: 'error', documentTypeId, message: FILE_TOO_LARGE_MESSAGE };
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return { status: 'error', documentTypeId, message: 'Allowed file types: PDF, Word (.doc/.docx), JPG, PNG.' };
  }

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

  return recordDocument(supabase, {
    applicationId, documentTypeId, sessionToken,
    objectKey, filename: file.name || objectKey.split('/').pop() || 'document',
    mimeType: file.type || null, sizeBytes: file.size,
  });
}

/** The row for a document already in Storage: the RPC validates the
 *  session token and replaces the slot's previous upload. */
async function recordDocument(
  supabase: ReturnType<typeof createClient>,
  d: {
    applicationId: number; documentTypeId: number; sessionToken: string;
    objectKey: string; filename: string; mimeType: string | null; sizeBytes: number;
  },
): Promise<UploadFormState> {
  const { applicationId, documentTypeId, sessionToken, objectKey } = d;
  // If the RPC fails we try to clean up the orphan upload.
  const { data: docId, error: rpcErr } = await supabase.rpc('submit_application_document', {
    p_application_id:   applicationId,
    p_session_token:    sessionToken,
    p_document_type_id: documentTypeId,
    p_storage_key:      objectKey,
    p_filename:         d.filename,
    p_mime_type:        d.mimeType,
    p_size_bytes:       d.sizeBytes,
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
    filename: d.filename,
  };
}
