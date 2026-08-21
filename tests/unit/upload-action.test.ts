/**
 * Integration tests for the step-2 document upload server action
 * (`app/apply/[id]/upload/upload-action.ts`).
 *
 * `@/lib/supabase/server` and `next/cache` are mocked; everything else runs
 * for real: input validation, size/MIME gatekeeping, the storage key shape,
 * the exact RPC payload, orphan cleanup, and cache revalidation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { submitApplicationDocument, type UploadFormState } from '@/app/apply/[id]/upload/upload-action';

const IDLE: UploadFormState = { status: 'idle' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSupabaseStub({
  uploadError = null as null | { message: string },
  rpcResult = { data: 999, error: null } as {
    data: unknown;
    error: null | { message: string; code?: string; details?: string; hint?: string };
  },
} = {}) {
  const upload = vi.fn().mockResolvedValue(
    uploadError ? { data: null, error: uploadError } : { data: { path: 'x' }, error: null },
  );
  const remove = vi.fn().mockResolvedValue({ data: [], error: null });
  const from = vi.fn(() => ({ upload, remove }));
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  const client = { storage: { from }, rpc };
  vi.mocked(createClient).mockReturnValue(client as unknown as ReturnType<typeof createClient>);
  return { client, from, upload, remove, rpc };
}

function makeFormData(
  overrides: Record<string, string | null> = {},
  file?: File | null,
): FormData {
  const defaults: Record<string, string> = {
    application_id: '55',
    document_type_id: '7',
    session_token: 'sess-tok-123',
  };
  const fd = new FormData();
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    if (value !== null) fd.set(key, value);
  }
  if (file) fd.set('file', file);
  return fd;
}

function makePdf(name = 'passport.pdf', bytes = 4096): File {
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://stub.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'stub-anon-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('submitApplicationDocument — happy path', () => {
  it('uploads under applications/{id}/{docTypeId}/, calls the RPC with exactly the 7 params, revalidates, returns success', async () => {
    const stub = makeSupabaseStub();
    const file = makePdf('passport.pdf', 4096);

    const result = await submitApplicationDocument(IDLE, makeFormData({}, file));

    expect(stub.from).toHaveBeenCalledWith('vacancy-cvs');
    expect(stub.upload).toHaveBeenCalledTimes(1);
    const [objectKey, uploadedFile, uploadOpts] = stub.upload.mock.calls[0];
    expect(objectKey).toMatch(
      /^applications\/55\/7\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-passport\.pdf$/,
    );
    expect(uploadedFile).toBe(file);
    expect(uploadOpts).toEqual({ contentType: 'application/pdf', upsert: false });

    // Exact 7-param RPC payload (toHaveBeenCalledWith matches the whole object).
    expect(stub.rpc).toHaveBeenCalledTimes(1);
    expect(stub.rpc).toHaveBeenCalledWith('submit_application_document', {
      p_application_id: 55,
      p_session_token: 'sess-tok-123',
      p_document_type_id: 7,
      p_storage_key: objectKey,
      p_filename: 'passport.pdf',
      p_mime_type: 'application/pdf',
      p_size_bytes: 4096,
    });

    expect(revalidatePath).toHaveBeenCalledWith('/apply/55/upload');
    expect(result).toEqual({
      status: 'success',
      documentTypeId: 7,
      filename: 'passport.pdf',
    });
  });

  it('accepts an image (jpeg) as well', async () => {
    const stub = makeSupabaseStub();
    const jpeg = new File([new Uint8Array(2000)], 'photo.jpg', { type: 'image/jpeg' });

    const result = await submitApplicationDocument(IDLE, makeFormData({}, jpeg));

    expect(result.status).toBe('success');
    expect(stub.rpc).toHaveBeenCalledWith(
      'submit_application_document',
      expect.objectContaining({ p_mime_type: 'image/jpeg', p_filename: 'photo.jpg' }),
    );
  });
});

describe('submitApplicationDocument — input validation (nothing persisted)', () => {
  it('missing session token → context error, documentTypeId preserved', async () => {
    const stub = makeSupabaseStub();

    const result = await submitApplicationDocument(
      IDLE,
      makeFormData({ session_token: '' }, makePdf()),
    );

    expect(result).toEqual({
      status: 'error',
      documentTypeId: 7,
      message: 'Missing application context — please reload the page and try again.',
    });
    expect(stub.upload).not.toHaveBeenCalled();
    expect(stub.rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('non-numeric application_id → context error', async () => {
    const stub = makeSupabaseStub();

    const result = await submitApplicationDocument(
      IDLE,
      makeFormData({ application_id: 'abc' }, makePdf()),
    );

    expect(result).toMatchObject({ status: 'error', documentTypeId: 7 });
    expect(stub.upload).not.toHaveBeenCalled();
    expect(stub.rpc).not.toHaveBeenCalled();
  });

  it('no file picked → "Pick a file first."', async () => {
    const stub = makeSupabaseStub();

    const result = await submitApplicationDocument(IDLE, makeFormData());

    expect(result).toEqual({
      status: 'error',
      documentTypeId: 7,
      message: 'Pick a file first.',
    });
    expect(stub.upload).not.toHaveBeenCalled();
  });

  it('file over 10 MB → size error, nothing persisted', async () => {
    const stub = makeSupabaseStub();
    const big = makePdf('big.pdf', 10 * 1024 * 1024 + 1);

    const result = await submitApplicationDocument(IDLE, makeFormData({}, big));

    expect(result).toEqual({
      status: 'error',
      documentTypeId: 7,
      message: 'That file is over 10 MB. Please upload a smaller version.',
    });
    expect(stub.upload).not.toHaveBeenCalled();
    expect(stub.rpc).not.toHaveBeenCalled();
  });

  it('disallowed MIME type → type error, nothing persisted', async () => {
    const stub = makeSupabaseStub();
    const zip = new File([new Uint8Array(100)], 'docs.zip', { type: 'application/zip' });

    const result = await submitApplicationDocument(IDLE, makeFormData({}, zip));

    expect(result).toEqual({
      status: 'error',
      documentTypeId: 7,
      message: 'Allowed file types: PDF, Word (.doc/.docx), JPG, PNG.',
    });
    expect(stub.upload).not.toHaveBeenCalled();
    expect(stub.rpc).not.toHaveBeenCalled();
  });

  it('KNOWN GAP: empty mime type bypasses the MIME check (same pattern as the apply action)', async () => {
    // `if (file.type && !ALLOWED_MIME.has(file.type))` lets a file with an
    // empty browser-reported type straight through; it is uploaded as
    // application/octet-stream and recorded with p_mime_type: null.
    const stub = makeSupabaseStub();
    const mystery = new File([new Uint8Array(100)], 'mystery.bin'); // type: ''

    const result = await submitApplicationDocument(IDLE, makeFormData({}, mystery));

    expect(result.status).toBe('success');
    const [, , uploadOpts] = stub.upload.mock.calls[0];
    expect(uploadOpts).toEqual({ contentType: 'application/octet-stream', upsert: false });
    expect(stub.rpc).toHaveBeenCalledWith(
      'submit_application_document',
      expect.objectContaining({ p_mime_type: null }),
    );
  });
});

describe('submitApplicationDocument — storage and RPC failures', () => {
  it('storage upload failure → generic upload error, RPC never called', async () => {
    const stub = makeSupabaseStub({ uploadError: { message: 'quota exceeded' } });

    const result = await submitApplicationDocument(IDLE, makeFormData({}, makePdf()));

    expect(result).toEqual({
      status: 'error',
      documentTypeId: 7,
      message: 'Upload failed. Please try again.',
    });
    expect(stub.rpc).not.toHaveBeenCalled();
    expect(stub.remove).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('RPC error mentioning "session" → mapped to the expired-link message, orphan removed', async () => {
    const stub = makeSupabaseStub({
      rpcResult: { data: null, error: { message: 'invalid or expired session token' } },
    });

    const result = await submitApplicationDocument(IDLE, makeFormData({}, makePdf()));

    expect(result).toEqual({
      status: 'error',
      documentTypeId: 7,
      message: 'Your upload link expired. Please open the email link again.',
    });
    const [objectKey] = stub.upload.mock.calls[0];
    expect(stub.remove).toHaveBeenCalledWith([objectKey]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('generic RPC error → "Could not record your upload", orphan removed', async () => {
    const stub = makeSupabaseStub({
      rpcResult: { data: null, error: { message: 'deadlock detected' } },
    });

    const result = await submitApplicationDocument(IDLE, makeFormData({}, makePdf()));

    expect(result).toEqual({
      status: 'error',
      documentTypeId: 7,
      message: 'Could not record your upload. Please try again.',
    });
    expect(stub.remove).toHaveBeenCalledTimes(1);
  });

  it('RPC returning null doc id without an error → treated as failure, orphan removed', async () => {
    const stub = makeSupabaseStub({ rpcResult: { data: null, error: null } });

    const result = await submitApplicationDocument(IDLE, makeFormData({}, makePdf()));

    expect(result).toMatchObject({
      status: 'error',
      documentTypeId: 7,
      message: 'Could not record your upload. Please try again.',
    });
    expect(stub.remove).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
