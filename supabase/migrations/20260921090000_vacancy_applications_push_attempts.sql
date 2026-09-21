-- Retry bookkeeping for the Carerix push.
--
-- Until now a failed push was never retried at all: pushPendingApplications
-- ToCarerix had no scheduler and no caller. Adding one without bookkeeping
-- would trade a silent loss for a different problem — a row Carerix will
-- never accept (a deleted publication, say) would be retried on every tick
-- forever, thousands of calls a day against a third-party API for one dead
-- application.
--
-- These two columns let the retry back off per row and eventually stand down,
-- leaving the row for apply_healthcheck.mjs and a human instead of hammering.
-- Both are additive with defaults, so they are safe to apply before the code
-- that writes them ships.

alter table public.vacancy_applications
  add column if not exists carerix_push_attempts integer not null default 0,
  add column if not exists carerix_last_attempt_at timestamptz;

comment on column public.vacancy_applications.carerix_push_attempts is
  'How many times the Carerix push has been attempted for this application. Drives the retry backoff and the give-up threshold.';

comment on column public.vacancy_applications.carerix_last_attempt_at is
  'When the Carerix push was last attempted (success or failure). Null means never attempted — the webhook did not reach the API at all.';
