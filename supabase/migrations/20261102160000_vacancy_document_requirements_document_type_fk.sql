-- vacancy_document_requirements had no foreign key to document_types, unlike
-- function_group_documents and company_document_requirements. PostgREST can
-- only embed `document_types ( … )` across a foreign key, so every select that
-- embedded it errored — for years silently (the caller read `data || []`, so a
-- vacancy's extra documents simply never counted), and from 2026-11-02 loudly:
-- confair-api's requirement loader fails closed on an unreadable table, which
-- broke the candidate completeness check and the completion-email dry run.
--
-- Same shape as the sibling tables. 83 rows, none orphaned, when added.
-- Applied to Confair_Website via Supabase MCP on 2026-11-02 (incident fix).

alter table public.vacancy_document_requirements
  add constraint vacancy_document_requirements_document_type_id_fkey
  foreign key (document_type_id) references public.document_types(id) on delete cascade;

notify pgrst, 'reload schema';
