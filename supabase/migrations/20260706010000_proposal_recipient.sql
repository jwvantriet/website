-- Recipient details for the "send proposal link to the signer" trigger
-- (POST /marketing/proposals/:id/send in confair-api). Idempotent, additive.
alter table public.proposals add column if not exists recipient_email text;
alter table public.proposals add column if not exists recipient_name  text;
alter table public.proposals add column if not exists sent_at         timestamptz;
