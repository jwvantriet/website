-- get_apply_upload_view: reject a NULL session token.
--
-- Security review 2026-10-27. The check was
--   if v_app.session_token is null or v_app.session_token <> p_session_token then return null;
-- With p_session_token = NULL, `<>` yields NULL, the whole condition is
-- `false or null` = NULL, and IF NULL does not fire — so the token check was
-- skipped. The function is executable by anon, so
--   POST /rest/v1/rpc/get_apply_upload_view {"p_application_id":N,"p_session_token":null}
-- with the publishable key returned name, email, vacancy, Carerix employee id
-- and uploaded document names for every application inside its 7-day window,
-- by walking N (sequential bigint).
--
-- Patches the LIVE body rather than re-creating it from an older migration,
-- and refuses to run if the body is not the one this fix was written against.

do $$
declare
  d   text := pg_get_functiondef('public.get_apply_upload_view(bigint, text)'::regprocedure);
  old text := 'if v_app.session_token is null or v_app.session_token <> p_session_token then return null;';
  new text := 'if p_session_token is null or v_app.session_token is null or v_app.session_token is distinct from p_session_token then return null;';
begin
  if position(old in d) = 0 then
    raise exception 'get_apply_upload_view: token check not found as expected — review the live definition by hand';
  end if;
  execute replace(d, old, new);
end $$;
