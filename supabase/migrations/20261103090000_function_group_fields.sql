-- The Experience form per function group: which fields a candidate in the
-- group is asked, per field required / optional / hidden.
--
-- Until now every group got the PILOT form (flight licence, MP-AC hours,
-- aircraft type per employer) with every field red while empty. Legacy My
-- Confair showed a different form per group; those forms are the defaults in
-- confair-api services/experience_fields.js, and a row here replaces the
-- default for one field. No row = the default, so applying this changes
-- nothing until recruitment edits a group (Recruitment setup → Function
-- groups).
--
-- A REQUIRED screening field (total flight hours, type rating, licence type,
-- IR expiry, medical class / date, able to swim, no visible tattoo) holds an
-- application in stage group 1 until it is filled.
--
-- Read/written only by confair-api with the service role (RLS on, no policy).

create table if not exists public.function_group_fields (
  function_group_id bigint      not null references public.function_groups(id) on delete cascade,
  field_key         text        not null,
  state             text        not null check (state in ('required', 'optional', 'hidden')),
  updated_at        timestamptz not null default now(),
  primary key (function_group_id, field_key)
);

alter table public.function_group_fields enable row level security;

create trigger function_group_fields_set_updated_at
  before update on public.function_group_fields
  for each row execute function public.set_updated_at();
