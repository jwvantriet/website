-- Confair_Website vacancy_applications: the RLS policy created in
-- 20260520030000_vacancy_applications.sql kept rejecting genuine anon
-- inserts even though its WITH CHECK clause was literally `true`. We
-- confirmed via a debug column populated with `current_user` that the
-- inserting role was `anon` — exactly what the policy targeted.
--
-- The fix that actually unstuck things was DISABLE → drop policy →
-- ENABLE RLS → create policy fresh, applied via Supabase MCP after a
-- live diagnostic session. Best guess: PostgREST or PostgreSQL was
-- holding a stale view of the policy across the load-balanced API
-- nodes, and only the full DISABLE/ENABLE cycle flushed it.
--
-- This migration is the source-control record of that fix; it's
-- already applied to the live database.

alter table public.vacancy_applications disable row level security;

drop policy if exists "anyone can submit a vacancy application" on public.vacancy_applications;
drop policy if exists "vacancy applications: anyone can insert"  on public.vacancy_applications;
drop policy if exists vacancy_applications_public_insert         on public.vacancy_applications;
drop policy if exists vacancy_applications_anon_insert           on public.vacancy_applications;

alter table public.vacancy_applications enable row level security;

create policy vacancy_applications_anon_insert
  on public.vacancy_applications
  for insert
  to anon, authenticated
  with check (true);
