-- Per-application readiness for the recruiters' "stuck in group 1" list.
--
-- confair-api decides per Carerix match whether an application may leave stage
-- group 1 (services/match_requirements.js). The snapshot keeps that result so
-- the list reads one query instead of several live Carerix calls per
-- candidate: [{ match_id, ready, blocked_reason, missing: [name], criteria_failed: [label] }].
-- Additive; applied to Confair_Website via Supabase MCP before the code that
-- writes it ships.

alter table public.candidate_funnel_snapshots
  add column if not exists match_readiness jsonb not null default '[]';
