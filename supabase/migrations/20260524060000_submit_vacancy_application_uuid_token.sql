-- Bug fix: submit_vacancy_application used encode(gen_random_bytes(24),'hex')
-- to mint the session token, but gen_random_bytes() lives in the pgcrypto
-- extension and isn't on the function's locked-down search_path
-- (`set search_path = public`). The function failed at runtime with
--
--   42883: function gen_random_bytes(integer) does not exist
--
-- which surfaced to the apply modal as the generic
-- "Could not submit your application. Please try again in a moment."
--
-- Switch to PostgreSQL's built-in gen_random_uuid() (pg_catalog, always
-- available). Concatenating two UUIDs with hyphens stripped gives 64 hex
-- chars / ~256 bits of entropy — overkill for a 7-day session token but
-- avoids any extension-on-search-path concern.
--
-- Already applied to Confair_Website via Supabase MCP.

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
returns table (id bigint, session_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     bigint;
  v_token  text;
  v_fg_id  bigint;
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

  if p_vacancy_id is not null then
    select function_group_id into v_fg_id
      from public.vacancies
     where id = p_vacancy_id;
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') ||
             replace(gen_random_uuid()::text, '-', '');

  insert into public.vacancy_applications (
    vacancy_id, vacancy_slug, vacancy_title, vacancy_carerix_id,
    first_name, last_name, email, phone, message,
    cv_object_key, cv_filename, cv_mime_type, cv_size_bytes,
    function_group_id, session_token, session_expires_at, step
  ) values (
    p_vacancy_id, p_vacancy_slug, p_vacancy_title, p_vacancy_carerix_id,
    trim(p_first_name), trim(p_last_name), trim(p_email), p_phone, p_message,
    p_cv_object_key, p_cv_filename, p_cv_mime_type, p_cv_size_bytes,
    v_fg_id, v_token, now() + interval '7 days',
    case when v_fg_id is null then 'applied' else 'documents_pending' end
  )
  returning vacancy_applications.id into v_id;

  return query select v_id, v_token;
end;
$$;

grant execute on function public.submit_vacancy_application(
  bigint, text, text, text, text, text, text, text, text, text, text, text, integer
) to anon, authenticated;
