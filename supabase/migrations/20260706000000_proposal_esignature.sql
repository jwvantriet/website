-- Proposal e-signature: verified simple electronic signature (SES).
--
-- Upgrades the online-proposal acceptance flow (confair.com/p/<token>) from a
-- plain click-through into a verified e-signature:
--   1. the signer proves control of the business email they name, via a
--      one-time code (challenge below);
--   2. acceptance is recorded with a tamper-evident audit trail — IP,
--      user-agent and a SHA-256 hash of the exact proposal content signed —
--      in an append-only signatures table.
--
-- Idempotent: safe to re-run. Only the confair-api service role touches these
-- (RLS on, no public policies), so the anon website key can never read codes
-- or the audit log.

-- --- Audit columns on the proposal itself (mirrors the latest signature) ---
alter table public.proposals add column if not exists accepted_by_email       text;
alter table public.proposals add column if not exists accepted_ip             text;
alter table public.proposals add column if not exists accepted_user_agent     text;
alter table public.proposals add column if not exists accepted_content_sha256 text;
alter table public.proposals add column if not exists signature_method        text;

-- --- Pending one-time-code challenges (transient) ---------------------------
create table if not exists public.proposal_signature_challenges (
  id             uuid primary key default gen_random_uuid(),
  proposal_id    bigint,
  proposal_token text        not null,
  email          text        not null,
  name           text        not null,
  job_title      text,
  note           text,
  code_hash      text        not null,   -- sha256(token.code.secret); never the raw code
  expires_at     timestamptz not null,
  attempts       integer     not null default 0,
  consumed_at    timestamptz,
  ip             text,
  user_agent     text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_prop_sig_challenges_token_email
  on public.proposal_signature_challenges (proposal_token, email);
create index if not exists idx_prop_sig_challenges_expires
  on public.proposal_signature_challenges (expires_at);

-- --- Append-only signature / audit record -----------------------------------
create table if not exists public.proposal_signatures (
  id                  uuid primary key default gen_random_uuid(),
  proposal_id         bigint,
  proposal_token      text        not null,
  signer_name         text        not null,
  signer_title        text,
  signer_email        text        not null,
  note                text,
  signed_at           timestamptz not null default now(),
  ip_address          text,
  user_agent          text,
  content_sha256      text,               -- hash of the proposal content signed
  verification_method text        not null default 'email_otp',
  challenge_id        uuid,
  created_at          timestamptz not null default now()
);

create index if not exists idx_prop_signatures_token
  on public.proposal_signatures (proposal_token);

-- --- Lock down: service-role only (RLS on, no public policies) --------------
alter table public.proposal_signature_challenges enable row level security;
alter table public.proposal_signatures           enable row level security;
