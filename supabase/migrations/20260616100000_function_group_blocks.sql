-- Per-function-group toggle for application "information blocks".
--
-- The candidate application/onboarding form is organised into fixed blocks —
-- Personal, Address, Passport, Experience. The fields inside each block are
-- fixed; this table lets the agency turn a whole block on/off per function group
-- (e.g. a non-aviation group may not need the aviation-centric Experience block).
--
-- Default behaviour: a block with no row is ENABLED. Only an explicit
-- is_enabled=false hides the block (in the candidate profile tabs) and drops its
-- fields from the submission completeness gate (confair-api computeProfile-
-- Completeness, mirroring how medical_class is already scoped per group).
--
-- Set in the agency account (Function Groups admin); taken into consideration
-- during the application process. Read/written only by confair-api with the
-- service role (RLS on, no policy). Applied to Confair_Website via Supabase MCP.

create table if not exists public.function_group_blocks (
  function_group_id bigint  not null references public.function_groups(id) on delete cascade,
  block             text    not null check (block in ('personal','address','passport','experience')),
  is_enabled        boolean not null default true,
  updated_at        timestamptz not null default now(),
  primary key (function_group_id, block)
);

alter table public.function_group_blocks enable row level security;

create trigger function_group_blocks_set_updated_at
  before update on public.function_group_blocks
  for each row execute function public.set_updated_at();
