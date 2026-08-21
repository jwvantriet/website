/**
 * Integration tests for the vacancy apply server action
 * (`app/vacancies/[slug]/apply-action.ts`).
 *
 * The Supabase client factory (`@/lib/supabase/server`) is mocked at the
 * module boundary, and `fetch` is stubbed for the two confair-api webhooks
 * (Carerix push + check-candidate). Everything else — validation, the CV
 * gatekeeping, the RPC payload shape, the orphan cleanup — is the real code.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { submitVacancyApplication, type ApplyFormState } from '@/app/vacancies/[slug]/apply-action';

const IDLE: ApplyFormState = { status: 'idle' };

const API_URL = 'https://api.test.confair.dev';
const SECRET = 'test-webhook-secret';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SupabaseStub {
  client: {
    storage: { from: ReturnType<typeof vi.fn> };
    rpc: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
  upload: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
}

function makeSupabaseStub({
  uploadError = null as null | { message: string },
  rpcResult = { data: { id: 123, session_token: 'tok-abc' }, error: null } as {
    data: unknown;
    error: null | { message: string; code?: string; details?: string; hint?: string };
  },
} = {}): SupabaseStub {
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

function stubFetch({
  accountExists = false,
  failWith = null as null | Error,
} = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    if (failWith) throw failWith;
    const url = String(input);
    if (url.endsWith('/webhooks/website/check-candidate')) {
      return new Response(JSON.stringify({ accountExists }), { status: 200 });
    }
    return new Response('ok', { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function makeFormData(
  overrides: Record<string, string | null> = {},
  cv?: File | null,
): FormData {
  const defaults: Record<string, string> = {
    vacancy_id: '42',
    vacancy_slug: 'senior-pilot-ams',
    vacancy_title: 'Senior Pilot AMS',
    vacancy_carerix_id: 'CR-9001',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@example.com',
    phone: '+31612345678',
  };
  const fd = new FormData();
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    if (value !== null) fd.set(key, value);
  }
  if (cv) fd.set('cv', cv);
  return fd;
}

function makePdf(name = 'cv.pdf', bytes = 1024): File {
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });
}

beforeEach(() => {
  vi.stubEnv('CONFAIR_API_URL', API_URL);
  vi.stubEnv('WEBSITE_WEBHOOK_SECRET', SECRET);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://stub.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'stub-anon-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('submitVacancyApplication — happy paths', () => {
  it('with CV: uploads to vacancy-cvs, calls the RPC with exactly the 13 params, fires both webhooks, returns success', async () => {
    const stub = makeSupabaseStub();
    const fetchMock = stubFetch({ accountExists: true });
    const cv = makePdf('My CV (final).pdf', 2048);

    const result = await submitVacancyApplication(IDLE, makeFormData({}, cv));

    // Storage upload into the vacancy-cvs bucket, key = slug/uuid-safeName.
    expect(stub.from).toHaveBeenCalledWith('vacancy-cvs');
    expect(stub.upload).toHaveBeenCalledTimes(1);
    const [uploadKey, uploadedFile, uploadOpts] = stub.upload.mock.calls[0];
    expect(uploadKey).toMatch(
      /^senior-pilot-ams\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-My_CV_final_.pdf$/,
    );
    expect(uploadedFile).toBe(cv);
    expect(uploadOpts).toEqual({ contentType: 'application/pdf', upsert: false });

    // The RPC receives EXACTLY these 13 p_* params (toHaveBeenCalledWith is
    // an exact object match — extra or missing keys fail).
    expect(stub.rpc).toHaveBeenCalledTimes(1);
    expect(stub.rpc).toHaveBeenCalledWith('submit_vacancy_application', {
      p_vacancy_id: 42,
      p_vacancy_slug: 'senior-pilot-ams',
      p_vacancy_title: 'Senior Pilot AMS',
      p_vacancy_carerix_id: 'CR-9001',
      p_first_name: 'Jane',
      p_last_name: 'Doe',
      p_email: 'jane.doe@example.com',
      p_phone: '+31612345678',
      p_message: null,
      p_cv_object_key: uploadKey,
      p_cv_filename: 'My CV (final).pdf',
      p_cv_mime_type: 'application/pdf',
      p_cv_size_bytes: 2048,
    });

    // Carerix push webhook: inserted id + Bearer secret.
    const pushCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes('/webhooks/website/vacancy-application'),
    );
    expect(pushCall).toBeDefined();
    expect(String(pushCall![0])).toBe(`${API_URL}/webhooks/website/vacancy-application`);
    const pushInit = pushCall![1] as RequestInit;
    expect(pushInit.method).toBe('POST');
    expect(pushInit.headers).toMatchObject({ Authorization: `Bearer ${SECRET}` });
    expect(pushInit.body).toBe(JSON.stringify({ application_id: 123 }));

    // check-candidate webhook with the applicant's email.
    const checkCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes('/webhooks/website/check-candidate'),
    );
    expect(checkCall).toBeDefined();
    expect(String(checkCall![0])).toBe(`${API_URL}/webhooks/website/check-candidate`);
    const checkInit = checkCall![1] as RequestInit;
    expect(checkInit.headers).toMatchObject({ Authorization: `Bearer ${SECRET}` });
    expect(checkInit.body).toBe(JSON.stringify({ email: 'jane.doe@example.com' }));

    // Success state carries the accountExists routing decision.
    expect(result).toEqual({
      status: 'success',
      redirectTo: '/apply/123/upload?token=tok-abc',
      applicationId: 123,
      sessionToken: 'tok-abc',
      accountExists: true,
      email: 'jane.doe@example.com',
    });
  });

  it('without CV: no storage upload, RPC called with null cv fields', async () => {
    const stub = makeSupabaseStub();
    stubFetch({ accountExists: false });

    const result = await submitVacancyApplication(IDLE, makeFormData());

    expect(stub.upload).not.toHaveBeenCalled();
    expect(stub.rpc).toHaveBeenCalledWith('submit_vacancy_application', {
      p_vacancy_id: 42,
      p_vacancy_slug: 'senior-pilot-ams',
      p_vacancy_title: 'Senior Pilot AMS',
      p_vacancy_carerix_id: 'CR-9001',
      p_first_name: 'Jane',
      p_last_name: 'Doe',
      p_email: 'jane.doe@example.com',
      p_phone: '+31612345678',
      p_message: null,
      p_cv_object_key: null,
      p_cv_filename: null,
      p_cv_mime_type: null,
      p_cv_size_bytes: null,
    });
    expect(result).toMatchObject({ status: 'success', accountExists: false });
  });

  it('non-numeric vacancy_id → RPC receives p_vacancy_id: null', async () => {
    const stub = makeSupabaseStub();
    stubFetch();

    const result = await submitVacancyApplication(
      IDLE,
      makeFormData({ vacancy_id: 'not-a-number' }),
    );

    expect(result.status).toBe('success');
    expect(stub.rpc).toHaveBeenCalledWith(
      'submit_vacancy_application',
      expect.objectContaining({ p_vacancy_id: null }),
    );
  });

  it('empty phone → RPC receives p_phone: null', async () => {
    const stub = makeSupabaseStub();
    stubFetch();

    await submitVacancyApplication(IDLE, makeFormData({ phone: '' }));

    expect(stub.rpc).toHaveBeenCalledWith(
      'submit_vacancy_application',
      expect.objectContaining({ p_phone: null }),
    );
  });
});

describe('submitVacancyApplication — validation failures (nothing persisted, no webhooks)', () => {
  it.each([
    ['missing first name', { first_name: '' }, 'Please enter your full name.'],
    ['missing last name', { last_name: '' }, 'Please enter your full name.'],
    ['missing email', { email: '' }, 'Please enter your email.'],
    ['invalid email', { email: 'not-an-email' }, "That email address doesn't look right."],
    [
      'missing vacancy slug',
      { vacancy_slug: '' },
      'Could not identify the vacancy. Please reload the page and try again.',
    ],
    [
      'missing vacancy title',
      { vacancy_title: '' },
      'Could not identify the vacancy. Please reload the page and try again.',
    ],
  ])('%s → error, no storage/RPC/fetch calls', async (_label, overrides, message) => {
    const stub = makeSupabaseStub();
    const fetchMock = stubFetch();

    const result = await submitVacancyApplication(IDLE, makeFormData(overrides, makePdf()));

    expect(result).toEqual({ status: 'error', message });
    expect(stub.upload).not.toHaveBeenCalled();
    expect(stub.rpc).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('submitVacancyApplication — CV gatekeeping', () => {
  it('CV over 5 MB → error, nothing persisted', async () => {
    const stub = makeSupabaseStub();
    const fetchMock = stubFetch();
    const bigCv = makePdf('big.pdf', 5 * 1024 * 1024 + 1);

    const result = await submitVacancyApplication(IDLE, makeFormData({}, bigCv));

    expect(result).toEqual({
      status: 'error',
      message: 'Your CV is too large. Please upload a file under 5 MB.',
    });
    expect(stub.upload).not.toHaveBeenCalled();
    expect(stub.rpc).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('disallowed MIME type → error, nothing persisted', async () => {
    const stub = makeSupabaseStub();
    const fetchMock = stubFetch();
    const zipCv = new File([new Uint8Array(100)], 'cv.zip', { type: 'application/zip' });

    const result = await submitVacancyApplication(IDLE, makeFormData({}, zipCv));

    expect(result).toEqual({
      status: 'error',
      message: 'CV must be a PDF or Word document (.pdf, .doc, .docx).',
    });
    expect(stub.upload).not.toHaveBeenCalled();
    expect(stub.rpc).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('KNOWN GAP: CV with an EMPTY mime type bypasses the MIME check and is uploaded as application/octet-stream', async () => {
    // The check is `if (cv.type && !ALLOWED_CV_MIME.has(cv.type))` — a file
    // whose browser-reported type is '' (common for unusual extensions or
    // some drag-and-drop sources) skips the allow-list entirely. The action
    // then uploads it with contentType 'application/octet-stream' and stores
    // p_cv_mime_type: null. This test documents the CURRENT behavior; it is
    // a known gap, not an endorsement — a real fix would sniff/deny unknown
    // types instead of letting them through.
    const stub = makeSupabaseStub();
    stubFetch();
    const mysteryCv = new File([new Uint8Array(100)], 'cv.exe'); // type: ''

    const result = await submitVacancyApplication(IDLE, makeFormData({}, mysteryCv));

    expect(result.status).toBe('success');
    expect(stub.upload).toHaveBeenCalledTimes(1);
    const [, , uploadOpts] = stub.upload.mock.calls[0];
    expect(uploadOpts).toEqual({ contentType: 'application/octet-stream', upsert: false });
    expect(stub.rpc).toHaveBeenCalledWith(
      'submit_vacancy_application',
      expect.objectContaining({
        p_cv_filename: 'cv.exe',
        p_cv_mime_type: null,
        p_cv_size_bytes: 100,
      }),
    );
  });

  it('KNOWN GAP: storage upload failure aborts the WHOLE application — the RPC is never called', async () => {
    // If the CV upload fails, the action returns the CV error and never
    // records the application at all, even though name/email/vacancy are
    // valid. The candidate's application is lost unless they retry. This
    // documents the current abort-the-application behavior; a friendlier
    // design would submit the application without the CV (or stash it for
    // retry) instead of dropping everything.
    const stub = makeSupabaseStub({ uploadError: { message: 'bucket exploded' } });
    const fetchMock = stubFetch();

    const result = await submitVacancyApplication(IDLE, makeFormData({}, makePdf()));

    expect(result).toEqual({
      status: 'error',
      message: 'Could not upload your CV. Please try again or contact us directly.',
    });
    expect(stub.rpc).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(stub.remove).not.toHaveBeenCalled();
  });
});

describe('submitVacancyApplication — RPC failure', () => {
  it('RPC error → error returned and the uploaded CV is removed (orphan cleanup)', async () => {
    const stub = makeSupabaseStub({
      rpcResult: { data: null, error: { message: 'permission denied', code: '42501' } },
    });
    const fetchMock = stubFetch();

    const result = await submitVacancyApplication(IDLE, makeFormData({}, makePdf()));

    expect(result).toEqual({
      status: 'error',
      message: 'Could not submit your application. Please try again in a moment.',
    });
    const [uploadKey] = stub.upload.mock.calls[0];
    expect(stub.remove).toHaveBeenCalledWith([uploadKey]);
    // No webhooks fire when the application row never landed.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('RPC "succeeds" but returns no id → treated as failure, CV removed', async () => {
    const stub = makeSupabaseStub({ rpcResult: { data: {}, error: null } });
    stubFetch();

    const result = await submitVacancyApplication(IDLE, makeFormData({}, makePdf()));

    expect(result.status).toBe('error');
    expect(stub.remove).toHaveBeenCalledTimes(1);
  });

  it('RPC failure without a CV → error returned, no storage remove attempted', async () => {
    const stub = makeSupabaseStub({
      rpcResult: { data: null, error: { message: 'boom' } },
    });
    stubFetch();

    const result = await submitVacancyApplication(IDLE, makeFormData());

    expect(result.status).toBe('error');
    expect(stub.remove).not.toHaveBeenCalled();
  });
});

describe('submitVacancyApplication — webhook resilience (fire-and-forget)', () => {
  it('fetch throwing on both webhooks → action still returns success, accountExists defaults to false', async () => {
    makeSupabaseStub();
    stubFetch({ failWith: new Error('ECONNREFUSED') });

    const result = await submitVacancyApplication(IDLE, makeFormData());

    expect(result).toMatchObject({
      status: 'success',
      applicationId: 123,
      accountExists: false,
    });
  });

  it('missing CONFAIR_API_URL / WEBSITE_WEBHOOK_SECRET → no fetch at all, still success', async () => {
    vi.stubEnv('CONFAIR_API_URL', '');
    vi.stubEnv('WEBSITE_WEBHOOK_SECRET', '');
    makeSupabaseStub();
    const fetchMock = stubFetch();

    const result = await submitVacancyApplication(IDLE, makeFormData());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'success',
      applicationId: 123,
      accountExists: false,
    });
  });

  it('Carerix push returning non-2xx → still success (agency retries from admin)', async () => {
    makeSupabaseStub();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('vacancy-application')) return new Response('nope', { status: 500 });
      return new Response(JSON.stringify({ accountExists: true }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await submitVacancyApplication(IDLE, makeFormData());

    expect(result).toMatchObject({ status: 'success', accountExists: true });
  });

  it('check-candidate returning non-2xx → accountExists falls back to false', async () => {
    makeSupabaseStub();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('check-candidate')) return new Response('nope', { status: 503 });
      return new Response('ok', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await submitVacancyApplication(IDLE, makeFormData());

    expect(result).toMatchObject({ status: 'success', accountExists: false });
  });
});
