-- Per-company document requirements, set by the agency in the platform's
-- Company-admin screen. Keyed by carerix_company_id because that's the only
-- company identifier shared with vacancies/applications (the website project
-- has no companies table of its own). The candidate document checklist
-- (GET /candidate/applications/:id/slots) unions these on top of the
-- function-group standard set.
--
-- Applied to Confair_Website (sntcxllhlwnxxbrzcuxb) via Supabase MCP
-- `apply_migration`. Captured here so the repo is the source of truth.

-- Link vacancies to their Carerix company so an application can resolve which
-- company's requirements apply. Populated by the website vacancy sync from
-- the publication's toCompany._id. Nullable: older rows / publications with
-- no company stay null and simply get the function-group set only.
alter table public.vacancies
  add column if not exists carerix_company_id text;
create index if not exists vacancies_carerix_company_idx
  on public.vacancies (carerix_company_id)
  where carerix_company_id is not null;

create table if not exists public.company_document_requirements (
  carerix_company_id text   not null,
  document_type_id   bigint not null references public.document_types(id) on delete cascade,
  is_required        boolean not null default true,
  display_order      integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (carerix_company_id, document_type_id)
);
create index if not exists company_document_requirements_company_idx
  on public.company_document_requirements (carerix_company_id, display_order);

-- Read/written only by confair-api with the service role (agency config +
-- candidate slot computation). No anon/authenticated policy: RLS on with no
-- policy denies direct client access, service role bypasses.
alter table public.company_document_requirements enable row level security;

create trigger company_document_requirements_set_updated_at
  before update on public.company_document_requirements
  for each row execute function public.set_updated_at();
