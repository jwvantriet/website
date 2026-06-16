-- AI screening verdicts per Carerix match — written by confair-api when a
-- candidate submits their profile (the screening-on-submit step), read by the
-- recruitment funnel so recruiters see WHY a candidate was green-lit or sent to
-- review (status + per-requirement evidence) without re-running the model.
--
-- Keyed by the Carerix match id (one current verdict per match; re-screening
-- upserts). Read/written only by confair-api with the service role (RLS on, no
-- policy). Applied to Confair_Website via Supabase MCP.

create table if not exists public.match_screening_verdicts (
  match_id            text primary key,
  carerix_employee_id text,
  vacancy_carerix_id  text,
  status              text not null check (status in ('qualify', 'decline', 'review')),
  summary             text,
  items               jsonb not null default '[]',
  model               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.match_screening_verdicts enable row level security;

create trigger match_screening_verdicts_set_updated_at
  before update on public.match_screening_verdicts
  for each row execute function public.set_updated_at();
