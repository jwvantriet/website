-- Applications submitted via the "Apply for this job" modal on the
-- vacancy detail page. Anon users INSERT; reads are agency-only (no
-- SELECT policy for anon). CVs land in storage.buckets / vacancy-cvs.
--
-- Already applied to the Confair_Website project via Supabase MCP
-- `apply_migration`; this file is the source of truth.

create table public.vacancy_applications (
  id                 bigserial primary key,
  vacancy_id         bigint references public.vacancies(id) on delete set null,
  vacancy_slug       text   not null,
  vacancy_title      text   not null,
  vacancy_carerix_id text,

  first_name         text   not null check (length(trim(first_name)) > 0),
  last_name          text   not null check (length(trim(last_name))  > 0),
  email              text   not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone              text,
  message            text,

  cv_object_key      text,
  cv_filename        text,
  cv_mime_type       text,
  cv_size_bytes      integer,

  -- Carerix push state (phase 2 — actual push happens once we have the
  -- legacy portal submission details).
  carerix_push_status text not null default 'new'
    check (carerix_push_status in ('new','pushed','failed','skipped')),
  carerix_pushed_at   timestamptz,
  carerix_response    jsonb,

  created_at         timestamptz not null default now()
);

create index vacancy_applications_vacancy_idx
  on public.vacancy_applications (vacancy_id, created_at desc);
create index vacancy_applications_push_status_idx
  on public.vacancy_applications (carerix_push_status, created_at)
  where carerix_push_status = 'new';

alter table public.vacancy_applications enable row level security;

create policy "anyone can submit a vacancy application"
  on public.vacancy_applications for insert
  to anon, authenticated
  with check (true);

-- CV storage bucket: private (no public read), 5MB cap, PDF/DOC/DOCX only.
-- Downloads happen via the service-role from confair-api or a future admin UI.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vacancy-cvs',
  'vacancy-cvs',
  false,
  5 * 1024 * 1024,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create policy "anyone can upload a CV"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'vacancy-cvs');
