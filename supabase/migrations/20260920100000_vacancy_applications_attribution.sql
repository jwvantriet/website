-- First-touch marketing attribution on vacancy applications.
--
-- The contact form and the salary-guide form both forward the
-- `confair_attribution` cookie (lib/attribution.ts) so every lead reaches
-- HubSpot tagged with the campaign that produced it. The apply form — the
-- highest-value form on the site — forwarded nothing, so we could not say
-- which channel produces pilots.
--
-- `p_attribution` is added with a DEFAULT so the currently-deployed website,
-- which calls this RPC with thirteen arguments, keeps working: this SQL is
-- safe to apply before the code that uses it ships. The old signature is
-- dropped rather than left in place, because two overloads where one has a
-- default make a thirteen-argument call ambiguous to PostgREST.

alter table public.vacancy_applications
  add column if not exists attribution jsonb;

comment on column public.vacancy_applications.attribution is
  'First-touch marketing attribution captured from the confair_attribution cookie (utm_*, referrer, landing_page). Null when the visitor arrived direct or declined marketing cookies.';

drop function if exists public.submit_vacancy_application(
  bigint, text, text, text, text, text, text, text, text, text, text, text, integer
);

create or replace function public.submit_vacancy_application(
  p_vacancy_id          bigint,
  p_vacancy_slug        text,
  p_vacancy_title       text,
  p_vacancy_carerix_id  text,
  p_first_name          text,
  p_last_name           text,
  p_email               text,
  p_phone               text    default null,
  p_message             text    default null,
  p_cv_object_key       text    default null,
  p_cv_filename         text    default null,
  p_cv_mime_type        text    default null,
  p_cv_size_bytes       integer default null,
  p_attribution         jsonb   default null
)
returns jsonb
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
    function_group_id, session_token, session_expires_at, step, attribution
  ) values (
    p_vacancy_id, p_vacancy_slug, p_vacancy_title, p_vacancy_carerix_id,
    trim(p_first_name), trim(p_last_name), trim(p_email), p_phone, p_message,
    p_cv_object_key, p_cv_filename, p_cv_mime_type, p_cv_size_bytes,
    v_fg_id, v_token, now() + interval '7 days',
    case when v_fg_id is null then 'applied' else 'documents_pending' end,
    p_attribution
  )
  returning vacancy_applications.id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'session_token', v_token
  );
end;
$$;

-- Restore the grants the dropped function carried: anon may only INSERT
-- through this function, never read/update/delete the table.
grant execute on function public.submit_vacancy_application(
  bigint, text, text, text, text, text, text, text, text, text, text, text, integer, jsonb
) to anon, authenticated, service_role;
