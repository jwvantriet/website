-- Link a proposal to a company (Carerix id) so the company portal can scope
-- proposals to the logged-in client. Idempotent, additive; already applied to
-- the Confair_Website project.
alter table public.proposals add column if not exists carerix_company_id text;
create index if not exists idx_proposals_carerix_company_id
  on public.proposals (carerix_company_id);
