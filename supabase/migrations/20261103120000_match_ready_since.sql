-- Since when a stage-group-1 application (Carerix match) has been READY — every
-- required document and detail in — so confair-api's automatic submit
-- (services/auto_submit.js) can move it on after a quiet period instead of
-- waiting for the candidate to press Submit. On 2026-11-03 a candidate had sat
-- ready for over a day without pressing it.
--
-- One row per match while it is ready; the sweep deletes the row when the
-- match is no longer ready (the clock starts again), and stamps submitted_at
-- when it moved it. Written only by confair-api with the service role (RLS
-- on, no policy).

create table if not exists public.match_ready_since (
  match_id             text        primary key,
  carerix_employee_id  text        not null,
  first_ready_at       timestamptz not null default now(),
  submitted_at         timestamptz,
  result               jsonb
);

create index if not exists match_ready_since_employee_idx on public.match_ready_since (carerix_employee_id);

alter table public.match_ready_since enable row level security;
