-- Per-vacancy requirements — the most specific layer of the recruitment
-- screening model. Two companion tables, both keyed by vacancy_carerix_id
-- (the Carerix publication id, shared across vacancies/applications):
--
--   vacancy_document_requirements — extra documents this vacancy needs,
--       on top of the position (function_group_documents) and company
--       (company_document_requirements) standard sets.
--
--   vacancy_data_requirements     — eligibility/screening rules a candidate
--       is auto-checked against (e.g. "min 6000 total hours", "valid EU
--       passport", "ICAO English level >= 5").
--
-- These tables were first applied to Confair_Website (sntcxllhlwnxxbrzcuxb)
-- directly via Supabase MCP; this migration captures them so the repo is the
-- source of truth and a fresh rebuild matches production. The CREATEs are
-- idempotent (if not exists) and match the live shape exactly.
--
-- Free-text "add a document": the admin types a document name; confair-api
-- find-or-creates a public.document_types row (slug derived from the name)
-- and references its id here — mirroring how company-wide documents are added,
-- so the catalog grows and the same document can be reused elsewhere.

create table if not exists public.vacancy_document_requirements (
  id                 uuid    primary key default gen_random_uuid(),
  vacancy_carerix_id text    not null,
  document_type_id   bigint  not null references public.document_types(id) on delete cascade,
  is_required        boolean not null default true,
  display_order      integer not null default 0,
  created_at         timestamptz not null default now(),
  unique (vacancy_carerix_id, document_type_id)
);
create index if not exists vacancy_document_requirements_vac_idx
  on public.vacancy_document_requirements (vacancy_carerix_id, display_order);

-- Generic eligibility/screening rules. `key` names the candidate attribute
-- (e.g. total_flight_hours, age, english_level, license, medical, nationality);
-- `operator` says how to compare; `value` (jsonb) is the threshold/expected:
--   present     — the attribute/document exists           value: null
--   min         — candidate value >= value                value: number
--   equals      — candidate value == value                value: scalar
--   one_of      — candidate value ∈ value                 value: array
--   not_expired — a dated attribute is still valid today   value: null
-- is_required=false marks a "preferred" criterion that never disqualifies.
create table if not exists public.vacancy_data_requirements (
  id                 uuid    primary key default gen_random_uuid(),
  vacancy_carerix_id text    not null,
  key                text    not null,
  label              text,
  operator           text    not null check (operator in ('present','min','equals','one_of','not_expired')),
  value              jsonb,
  is_required        boolean not null default true,
  display_order      integer not null default 0,
  created_at         timestamptz not null default now(),
  unique (vacancy_carerix_id, key)
);
create index if not exists vacancy_data_requirements_vac_idx
  on public.vacancy_data_requirements (vacancy_carerix_id, display_order);

-- Read/written only by confair-api with the service role. RLS on, no policy.
alter table public.vacancy_document_requirements enable row level security;
alter table public.vacancy_data_requirements     enable row level security;
