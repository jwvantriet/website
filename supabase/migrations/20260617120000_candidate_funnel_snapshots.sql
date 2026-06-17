-- Cached per-candidate snapshot for the recruitment funnel drawer. Opening a
-- candidate used to fire several live Carerix calls (profile, function groups,
-- document checklist, attachment list); this table holds the computed result so
-- the drawer reads it in one fast query. confair-api keeps it fresh
-- stale-while-revalidate: it serves the snapshot immediately and refreshes from
-- Carerix in the background once it's older than the TTL. Carerix stays the
-- source of truth.
--
-- Keyed by Carerix employee id (one snapshot per candidate; refresh upserts).
-- Read/written only by confair-api with the service role (RLS on, no policy).
-- Apply to Confair_Website via Supabase MCP / SQL editor.

create table if not exists public.candidate_funnel_snapshots (
  carerix_employee_id text primary key,
  complete            boolean not null default false,
  -- Required-document checklist statuses: [{ name, on_file }]
  documents           jsonb   not null default '[]',
  -- Profile data items: [{ label, present }]
  profile_items       jsonb   not null default '[]',
  -- Human-readable list of what's still missing (doc names + data labels).
  missing             jsonb   not null default '[]',
  -- Full document list for the drawer's quick-view popup:
  -- [{ id, filename, mime_type, type_label, created_at }]
  documents_list      jsonb   not null default '[]',
  -- When the snapshot was last pulled from Carerix (drives the TTL refresh).
  synced_at           timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.candidate_funnel_snapshots enable row level security;

create trigger candidate_funnel_snapshots_set_updated_at
  before update on public.candidate_funnel_snapshots
  for each row execute function public.set_updated_at();
