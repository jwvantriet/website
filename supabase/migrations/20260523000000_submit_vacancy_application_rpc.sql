-- RPC entry point for the public apply modal.
--
-- We spent an afternoon fighting a stale PostgREST policy cache on
-- vacancy_applications — direct INSERT INTO ... as anon kept getting
-- rejected even after multiple cache-flush attempts, even though
-- SQL-level diagnostics with `SET LOCAL ROLE anon` confirmed the
-- policy was working. The function below bypasses RLS entirely by
-- running as the function owner (postgres) with `SECURITY DEFINER`.
-- It also gives anon a more constrained surface than the table — they
-- can only INSERT through these typed parameters, never read or
-- modify arbitrary rows.
--
-- Already applied to the Confair_Website project via Supabase MCP;
-- this file is the source-of-truth for any future clean deploy.

create or replace function public.submit_vacancy_application(
  p_vacancy_id          bigint,
  p_vacancy_slug        text,
  p_vacancy_title       text,
  p_vacancy_carerix_id  text,
  p_first_name          text,
  p_last_name           text,
  p_email               text,
  p_phone               text default null,
  p_message             text default null,
  p_cv_object_key       text default null,
  p_cv_filename         text default null,
  p_cv_mime_type        text default null,
  p_cv_size_bytes       integer default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if p_first_name is null or length(trim(p_first_name)) = 0 then
    raise exception 'first_name required';
  end if;
  if p_last_name is null or length(trim(p_last_name)) = 0 then
    raise exception 'last_name required';
  end if;
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'valid email required';
  end if;
  if p_vacancy_slug is null or length(trim(p_vacancy_slug)) = 0 then
    raise exception 'vacancy_slug required';
  end if;
  if p_vacancy_title is null or length(trim(p_vacancy_title)) = 0 then
    raise exception 'vacancy_title required';
  end if;

  insert into public.vacancy_applications (
    vacancy_id, vacancy_slug, vacancy_title, vacancy_carerix_id,
    first_name, last_name, email, phone, message,
    cv_object_key, cv_filename, cv_mime_type, cv_size_bytes
  ) values (
    p_vacancy_id, p_vacancy_slug, p_vacancy_title, p_vacancy_carerix_id,
    trim(p_first_name), trim(p_last_name), trim(p_email), p_phone, p_message,
    p_cv_object_key, p_cv_filename, p_cv_mime_type, p_cv_size_bytes
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_vacancy_application(
  bigint, text, text, text, text, text, text, text, text, text, text, text, integer
) from public;

grant execute on function public.submit_vacancy_application(
  bigint, text, text, text, text, text, text, text, text, text, text, text, integer
) to anon, authenticated;
