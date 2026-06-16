-- Information-request blocks per function group — the agency-configured
-- application form. Each function group defines the fields a candidate is asked
-- to provide, grouped into blocks (Personal / Address / Passport / Experience).
-- Personal/Address/Passport are common; the Experience block is sector-specific
-- (Pilot, Cabin Crew, Maritime, Offshore — seeded from templates in confair-api).
--
-- Optional screening feed: a field with screening_operator set also drives the
-- auto-screening engine. confair-api keeps a matching public.function_group_data_
-- requirements row in sync (field_key -> key), so a single screening source of
-- truth is reused (see services/screening.js + the effective-merge).
--
-- Set in the agency account; taken into consideration during the application
-- process. Read/written only by confair-api with the service role (RLS on, no
-- policy). Applied to Confair_Website (sntcxllhlwnxxbrzcuxb) via Supabase MCP.

create table if not exists public.function_group_information_fields (
  id                  uuid    primary key default gen_random_uuid(),
  function_group_id   bigint  not null references public.function_groups(id) on delete cascade,
  block               text    not null check (block in ('personal','address','passport','experience')),
  field_key           text    not null,
  label               text    not null,
  field_type          text    not null check (field_type in ('text','number','date','select','multiselect','boolean')),
  options             text[],                 -- choices for select / multiselect
  is_required         boolean not null default false,
  display_order       integer not null default 0,

  -- Screening feed (optional). When screening_operator is set, confair-api
  -- mirrors this field into function_group_data_requirements so the candidate
  -- is auto-checked against it. Cleared => the mirror row is removed.
  screening_operator  text check (screening_operator in ('present','min','equals','one_of','not_expired')),
  screening_value     jsonb,
  screening_mandatory boolean not null default true,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (function_group_id, block, field_key)
);
create index if not exists function_group_information_fields_fg_idx
  on public.function_group_information_fields (function_group_id, block, display_order);

alter table public.function_group_information_fields enable row level security;

create trigger function_group_information_fields_set_updated_at
  before update on public.function_group_information_fields
  for each row execute function public.set_updated_at();
