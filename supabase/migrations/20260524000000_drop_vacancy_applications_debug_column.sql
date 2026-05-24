-- debug_inserting_role was added during the RLS-stale-cache investigation
-- to capture which Postgres role was actually performing each insert. With
-- the SECURITY DEFINER RPC in place (submit_vacancy_application) every
-- row is now inserted as the function owner, so the column carries no
-- diagnostic value going forward.
--
-- Already applied to the Confair_Website project via Supabase MCP.

alter table public.vacancy_applications drop column if exists debug_inserting_role;
