-- Schema for the post-apply enrichment flow.
--
-- Three reference tables (function groups, document types, and the
-- many-to-many that maps which docs are required/optional per group),
-- plus extensions to vacancies + vacancy_applications and a new
-- vacancy_application_documents table that doubles as a Supabase cache
-- and a Carerix sync ledger.
--
-- Already applied to Confair_Website via Supabase MCP.

-- ── function_groups ───────────────────────────────────────────────────
create table public.function_groups (
  id              bigserial primary key,
  industry        text not null check (industry in ('Aviation','Maritime','Offshore')),
  slug            text not null unique,
  name            text not null,
  carerix_node_id  text,
  carerix_node_tag text,
  display_order   integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index function_groups_industry_idx
  on public.function_groups (industry, display_order);

alter table public.function_groups enable row level security;
create policy function_groups_public_read
  on public.function_groups for select to anon, authenticated using (is_active = true);

-- ── document_types ────────────────────────────────────────────────────
create table public.document_types (
  id              bigserial primary key,
  slug            text not null unique,
  name            text not null,
  description     text,
  -- Carerix CRDataNode tag used in crEmployeeApply attachments.toTypeNode._lookup
  carerix_tag     text,
  display_order   integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table public.document_types enable row level security;
create policy document_types_public_read
  on public.document_types for select to anon, authenticated using (is_active = true);

-- ── function_group_documents (required/optional matrix) ───────────────
create table public.function_group_documents (
  function_group_id  bigint not null references public.function_groups(id) on delete cascade,
  document_type_id   bigint not null references public.document_types(id)  on delete cascade,
  is_required        boolean not null default false,
  display_order      integer not null default 0,
  primary key (function_group_id, document_type_id)
);
create index function_group_documents_fg_idx
  on public.function_group_documents (function_group_id, display_order);

alter table public.function_group_documents enable row level security;
create policy function_group_documents_public_read
  on public.function_group_documents for select to anon, authenticated using (true);

-- ── Extend vacancies ──────────────────────────────────────────────────
alter table public.vacancies
  add column function_group_id bigint references public.function_groups(id) on delete set null;
create index vacancies_function_group_idx on public.vacancies (function_group_id);

-- ── Extend vacancy_applications ───────────────────────────────────────
alter table public.vacancy_applications
  add column function_group_id  bigint references public.function_groups(id) on delete set null,
  add column session_token       text unique,
  add column session_expires_at  timestamptz,
  add column step                text not null default 'applied'
    check (step in ('applied','documents_pending','documents_uploaded','verifying','completed','abandoned')),
  add column completed_at        timestamptz;
create index vacancy_applications_session_idx on public.vacancy_applications (session_token)
  where session_token is not null;
create index vacancy_applications_step_idx on public.vacancy_applications (step, created_at);

-- ── vacancy_application_documents ─────────────────────────────────────
create table public.vacancy_application_documents (
  id                  bigserial primary key,
  application_id      bigint not null references public.vacancy_applications(id) on delete cascade,
  document_type_id    bigint references public.document_types(id),

  storage_key         text not null,
  filename            text not null,
  mime_type           text not null,
  size_bytes          integer not null,

  ai_extracted_at     timestamptz,
  ai_extracted        jsonb,
  ai_error            text,
  ai_model            text,

  carerix_attachment_id text,
  carerix_pushed_at     timestamptz,
  carerix_push_status   text not null default 'pending'
    check (carerix_push_status in ('pending','synced','failed','skipped')),
  carerix_push_attempts integer not null default 0,
  carerix_last_error    text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index vacancy_app_docs_application_idx
  on public.vacancy_application_documents (application_id, document_type_id);
create index vacancy_app_docs_pending_idx
  on public.vacancy_application_documents (carerix_push_status, created_at)
  where carerix_push_status in ('pending','failed');

alter table public.vacancy_application_documents enable row level security;

-- ── vacancy_application_profiles ──────────────────────────────────────
create table public.vacancy_application_profiles (
  application_id      bigint primary key references public.vacancy_applications(id) on delete cascade,

  first_name          text,
  last_name           text,
  middle_name         text,
  dob                 date,
  nationality         text,
  address_line        text,
  city                text,
  postal_code         text,
  country             text,
  phone               text,

  passport_number     text,
  passport_expiry     date,

  total_flight_hours  integer,
  current_ratings     text[],
  preferred_base      text,

  languages           jsonb,
  education           jsonb,
  experience          jsonb,

  verified_at         timestamptz,
  verified_data       jsonb,

  carerix_pushed_at   timestamptz,
  carerix_push_status text not null default 'pending'
    check (carerix_push_status in ('pending','synced','failed','skipped')),
  carerix_last_error  text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.vacancy_application_profiles enable row level security;

-- ── triggers ──────────────────────────────────────────────────────────
create trigger vacancy_app_docs_set_updated_at
  before update on public.vacancy_application_documents
  for each row execute function public.set_updated_at();

create trigger vacancy_app_profiles_set_updated_at
  before update on public.vacancy_application_profiles
  for each row execute function public.set_updated_at();
