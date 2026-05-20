-- Fix: the original INSERT policy on public.vacancy_applications, created
-- in 20260520030000_vacancy_applications.sql with seemingly identical
-- semantics, kept rejecting genuine anon inserts with:
--
--   ERROR: 42501: new row violates row-level security policy
--
-- We reproduced it via Supabase MCP against a real `SET LOCAL ROLE anon`
-- session — the policy WITH CHECK clause didn't pass even though it was
-- literally `true`. Dropping the policy, dropping RLS, then re-enabling
-- RLS and creating an equivalent policy makes it work. Best guess: a
-- transient Supabase/Postgres caching condition during the initial
-- migration left the policy attached but not effective. Rather than
-- spend more time on root cause, capture the working state here so
-- future clean deploys produce the right result.
--
-- Already applied to the Confair_Website project via Supabase MCP.

alter table public.vacancy_applications disable row level security;

drop policy if exists "anyone can submit a vacancy application" on public.vacancy_applications;
drop policy if exists "vacancy applications: anyone can insert"  on public.vacancy_applications;
drop policy if exists vacancy_applications_anon_insert           on public.vacancy_applications;

alter table public.vacancy_applications enable row level security;

create policy vacancy_applications_anon_insert
  on public.vacancy_applications
  for insert
  to anon, authenticated
  with check (true);
