-- Extends public.vacancies with the rich fields the Carerix sync produces.
-- Applied 2026-05-20 via Supabase MCP `apply_migration` against project
-- sntcxllhlwnxxbrzcuxb (Confair_Website). Captured here so the repo is the
-- source of truth.
--
-- Paired with confair-api PR #260 which writes these fields.

alter table public.vacancies
  add column if not exists intro_html         text,
  add column if not exists vacancy_html       text,
  add column if not exists requirements_html  text,
  add column if not exists offer_html         text,
  add column if not exists company_html       text,
  add column if not exists contact_html       text,

  add column if not exists reference_number   text,
  add column if not exists publication_start  timestamptz,
  add column if not exists publication_end    timestamptz,
  add column if not exists company_name       text,

  -- Optional metadata for the right-hand sidebar — populated when Carerix
  -- exposes a consultant on the publication. Nullable; the page falls back
  -- to a generic Confair contact card when absent.
  add column if not exists consultant_name    text,
  add column if not exists consultant_title   text,
  add column if not exists consultant_phone   text,
  add column if not exists consultant_email   text,
  add column if not exists consultant_photo   text;

-- Carerix ID is the upsert key for the sync. Enforce uniqueness so two
-- sync runs can't accidentally create duplicates.
create unique index if not exists vacancies_carerix_id_uq
  on public.vacancies (carerix_id)
  where carerix_id is not null;
