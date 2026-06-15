-- Position- and company-level eligibility/screening rules — the upper two
-- layers of the screening model. They mirror vacancy_data_requirements (same
-- key/operator/value shape) so the confair-api evaluator treats all three
-- layers uniformly and merges them into one "effective" set per vacancy:
--
--   function_group_data_requirements (position standard)
--     ⊕ company_data_requirements      (per Carerix company, optionally per
--                                        function group via function_group_id)
--       ⊕ vacancy_data_requirements    (per individual vacancy — already exists)
--
-- Most specific layer wins on a given `key`; vacancy overrides company overrides
-- position. This matches the document layers (function_group_documents ⊕
-- company_document_requirements ⊕ vacancy_document_requirements).
--
-- Applied to Confair_Website (sntcxllhlwnxxbrzcuxb) via Supabase MCP
-- `apply_migration`. Captured here so the repo is the source of truth.

-- Position level: standard rules for a function group (e.g. all Captains).
create table if not exists public.function_group_data_requirements (
  id                uuid    primary key default gen_random_uuid(),
  function_group_id bigint  not null references public.function_groups(id) on delete cascade,
  key               text    not null,
  label             text,
  operator          text    not null check (operator in ('present','min','equals','one_of','not_expired')),
  value             jsonb,
  is_required       boolean not null default true,
  display_order     integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (function_group_id, key)
);
create index if not exists function_group_data_requirements_fg_idx
  on public.function_group_data_requirements (function_group_id, display_order);

-- Company level. function_group_id = 0 is the sentinel for "all function
-- groups in this company" (same convention as company_document_requirements);
-- a real function_group_id scopes the rule to that position within the company.
create table if not exists public.company_data_requirements (
  id                 uuid    primary key default gen_random_uuid(),
  carerix_company_id text    not null,
  function_group_id  bigint  not null default 0,
  key                text    not null,
  label              text,
  operator           text    not null check (operator in ('present','min','equals','one_of','not_expired')),
  value              jsonb,
  is_required        boolean not null default true,
  display_order      integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (carerix_company_id, function_group_id, key)
);
create index if not exists company_data_requirements_company_idx
  on public.company_data_requirements (carerix_company_id, function_group_id, display_order);

-- Read/written only by confair-api with the service role. RLS on, no policy.
alter table public.function_group_data_requirements enable row level security;
alter table public.company_data_requirements        enable row level security;

create trigger function_group_data_requirements_set_updated_at
  before update on public.function_group_data_requirements
  for each row execute function public.set_updated_at();
create trigger company_data_requirements_set_updated_at
  before update on public.company_data_requirements
  for each row execute function public.set_updated_at();
