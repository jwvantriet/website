-- Log of "complete your profile" reminders sent to a candidate, shown in the
-- recruitment-funnel candidate drawer so recruiters can see what's been chased
-- and when. Written by confair-api (the recruiter clicks "Send reminder");
-- channel records how it was sent (push today). RLS on, no policy (service-role
-- only). Applied to Confair_Website via Supabase MCP.

create table if not exists public.candidate_reminders (
  id                  uuid    primary key default gen_random_uuid(),
  carerix_employee_id text    not null,
  match_id            text,
  channel             text    not null default 'push' check (channel in ('push', 'email', 'manual')),
  message             text,
  delivered           boolean not null default false,
  sent_by_user_id     uuid,
  sent_by_name        text,
  created_at          timestamptz not null default now()
);
create index if not exists candidate_reminders_emp_idx
  on public.candidate_reminders (carerix_employee_id, created_at desc);

alter table public.candidate_reminders enable row level security;
