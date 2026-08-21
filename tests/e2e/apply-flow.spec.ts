/**
 * E2E: the full vacancy application flow, including the step-2 document
 * uploads, against a REAL deployed site.
 *
 * This suite is strictly opt-in because the full-flow test creates a REAL
 * application (Supabase row + CV in the vacancy-cvs bucket + Carerix push).
 * Point it at a designated TEST vacancy only:
 *
 *   E2E_BASE_URL=https://<preview>.vercel.app \
 *   E2E_TEST_VACANCY_SLUG=<test-vacancy-slug> \
 *   E2E_APPLY_ENABLED=1 \
 *   npm run test:e2e
 *
 * Without E2E_BASE_URL + E2E_TEST_VACANCY_SLUG everything skips; without
 * E2E_APPLY_ENABLED=1 only the non-submitting client-side validation test
 * runs.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect, type Page, type Locator } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || '';
const VACANCY_SLUG = process.env.E2E_TEST_VACANCY_SLUG || '';
const APPLY_ENABLED = process.env.E2E_APPLY_ENABLED === '1';

// --------------------------------------------------------------------------
// Test fixtures: a minimal valid PDF and an oversized (>5 MB) PDF, written
// to temp files so setInputFiles attaches them like a real file pick.
// --------------------------------------------------------------------------

const MINIMAL_PDF = Buffer.from(
  [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>',
    'endobj',
    'xref',
    '0 4',
    '0000000000 65535 f ',
    'trailer',
    '<< /Size 4 /Root 1 0 R >>',
    'startxref',
    '9',
    '%%EOF',
    '',
  ].join('\n'),
  'latin1',
);

let smallPdfPath: string;
let oversizedPdfPath: string;

test.beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), 'confair-e2e-'));
  smallPdfPath = join(dir, 'e2e-cv.pdf');
  writeFileSync(smallPdfPath, MINIMAL_PDF);
  // Valid PDF header followed by padding to push it past the 5 MB CV limit.
  // Never actually submitted — it only has to trip the client-side check.
  oversizedPdfPath = join(dir, 'e2e-oversized.pdf');
  writeFileSync(
    oversizedPdfPath,
    Buffer.concat([MINIMAL_PDF, Buffer.alloc(5 * 1024 * 1024 + 1024, 0x20)]),
  );
});

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Open the apply modal from the vacancy detail page and return the dialog. */
async function openApplyDialog(page: Page): Promise<Locator> {
  await page.goto(`/vacancies/${VACANCY_SLUG}`);
  // The page renders the apply CTA twice (top + bottom variants) — either works.
  await page.getByRole('button', { name: 'Apply for this job' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

// The form's labels are not programmatically associated with the inputs
// (no htmlFor/id pairing in ApplyButton.tsx), so getByLabel cannot resolve
// them — the stable `name` attributes are the next most resilient hook.
function applyField(dialog: Locator, name: string): Locator {
  return dialog.locator(`input[name="${name}"]`);
}

test.describe('vacancy application flow', () => {
  test.skip(
    !BASE_URL || !VACANCY_SLUG,
    'Set E2E_BASE_URL and E2E_TEST_VACANCY_SLUG to run the apply-flow E2E suite.',
  );

  test('apply with CV and upload all required documents', async ({ page }) => {
    test.skip(
      !APPLY_ENABLED,
      'Set E2E_APPLY_ENABLED=1 to run the full flow — it creates a REAL application.',
    );
    // The server action awaits the Carerix push (15 s budget) + the
    // check-candidate webhook before returning; give the whole journey room.
    test.setTimeout(180_000);

    // -- Step 1: submit the application with a CV --------------------------
    const dialog = await openApplyDialog(page);

    await applyField(dialog, 'first_name').fill('E2E');
    await applyField(dialog, 'last_name').fill('Test');
    const email = `e2e+${Date.now()}@confair.dev`;
    await applyField(dialog, 'email').fill(email);
    await applyField(dialog, 'phone').fill('+31612345678');

    // Hidden file input behind the "Choose file" button.
    await applyField(dialog, 'cv').setInputFiles(smallPdfPath);
    await expect(dialog.getByText('e2e-cv.pdf')).toBeVisible();

    await dialog.getByRole('button', { name: 'Submit Application' }).click();

    // -- Step 2: success state → extract application_id + token ------------
    await expect(
      dialog.getByRole('heading', { name: 'Application received' }),
    ).toBeVisible({ timeout: 45_000 });

    // A brand-new unique email means accountExists=false, so the modal
    // renders the "Create my password" link to
    // {platform}/welcome?application_id=<id>&token=<token>.
    const welcomeLink = dialog.getByRole('link', { name: /Create my password/ });
    await expect(welcomeLink).toBeVisible();
    const href = await welcomeLink.getAttribute('href');
    expect(href).toBeTruthy();
    const welcomeUrl = new URL(href!);
    const applicationId = welcomeUrl.searchParams.get('application_id');
    const token = welcomeUrl.searchParams.get('token');
    expect(applicationId).toMatch(/^\d+$/);
    expect(token).toBeTruthy();

    // -- Step 3: the document upload page on THIS site ----------------------
    await page.goto(
      `/apply/${applicationId}/upload?token=${encodeURIComponent(token!)}`,
    );

    // Either the slot checklist ("Almost there, …") or — if the test vacancy
    // has no function group — the fallback screen. The fallback renders no
    // slots, so the loop below is a no-op in that case.
    await expect(
      page.getByRole('heading', {
        name: /Almost there|We.{1,3}ve received your application/,
      }),
    ).toBeVisible({ timeout: 30_000 });

    // -- Step 4: upload a document into EVERY rendered slot -----------------
    // Every slot accepts PDF (UploadList shares one ACCEPT list across all
    // slots: PDF/Word/JPG/PNG/WEBP/HEIC), so the small PDF fits everywhere;
    // no image-only slots exist in the current markup.
    const slotIdInputs = page.locator('form input[name="document_type_id"]');
    const slotIds: string[] = [];
    for (const input of await slotIdInputs.all()) {
      slotIds.push(await input.inputValue());
    }

    for (const slotId of slotIds) {
      const form = page.locator(
        `form:has(input[name="document_type_id"][value="${slotId}"])`,
      );
      // Picking a file auto-submits the slot's form (onChange → requestSubmit).
      await form.locator('input[type="file"][name="file"]').setInputFiles(smallPdfPath);

      // Success flips the slot to its uploaded state: the action button
      // becomes "Replace" and the filename renders in the slot body.
      await expect(form.getByRole('button', { name: /Replace/ })).toBeVisible({
        timeout: 30_000,
      });
      await expect(form.getByText('e2e-cv.pdf')).toBeVisible();
      // ...and this slot shows no error message.
      await expect(form.locator('.text-red-600')).toHaveCount(0);
    }

    // -- Step 5: no slot anywhere remains in an error state -----------------
    await expect(page.locator('form .text-red-600')).toHaveCount(0);
    await expect(page.getByText('Uploading…')).toHaveCount(0);
    if (slotIds.length > 0) {
      // Every slot uploaded → every slot offers "Replace".
      await expect(
        page.getByRole('button', { name: /Replace/ }),
      ).toHaveCount(slotIds.length);
    }
  });

  test('client-side validation blocks bad submissions without creating an application', async ({
    page,
  }) => {
    const dialog = await openApplyDialog(page);

    // Empty submit → the browser's built-in required-field validation blocks
    // the form before the server action ever runs.
    await dialog.getByRole('button', { name: 'Submit Application' }).click();
    const firstName = applyField(dialog, 'first_name');
    expect(
      await firstName.evaluate((el: HTMLInputElement) => el.validity.valueMissing),
    ).toBe(true);
    expect(
      await firstName.evaluate((el: HTMLInputElement) => el.matches(':invalid')),
    ).toBe(true);
    // Still on the form — no success state was reached.
    await expect(
      dialog.getByRole('heading', { name: 'Application received' }),
    ).toHaveCount(0);

    // Oversized CV (>5 MB) → client-side size check rejects it on pick.
    await applyField(dialog, 'cv').setInputFiles(oversizedPdfPath);
    await expect(dialog.getByText('CV must be under 5 MB.')).toBeVisible();

    // Deliberately DO NOT submit a real application in this test.
  });
});
