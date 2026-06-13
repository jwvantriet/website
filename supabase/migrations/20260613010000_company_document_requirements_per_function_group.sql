-- Allow per-function-group document requirements within a company. A company
-- with several function groups can now scope a requirement to one of them,
-- or leave it company-wide.
--
-- function_group_id = 0 is the sentinel for "all function groups" (company-
-- wide). function_groups.id is a bigserial starting at 1, so 0 never collides
-- with a real group. Existing rows default to 0, preserving their company-wide
-- meaning. No FK on function_group_id because of the 0 sentinel.
--
-- Applied to Confair_Website (sntcxllhlwnxxbrzcuxb) via Supabase MCP.

alter table public.company_document_requirements
  add column if not exists function_group_id bigint not null default 0;

alter table public.company_document_requirements
  drop constraint if exists company_document_requirements_pkey;

alter table public.company_document_requirements
  add constraint company_document_requirements_pkey
  primary key (carerix_company_id, function_group_id, document_type_id);

drop index if exists public.company_document_requirements_company_idx;
create index company_document_requirements_company_idx
  on public.company_document_requirements (carerix_company_id, function_group_id, display_order);
