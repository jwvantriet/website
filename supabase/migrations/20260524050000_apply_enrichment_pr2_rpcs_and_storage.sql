-- PR 2: support post-apply document upload.
--
-- Three pieces:
--   1. Extend the vacancy-cvs bucket to accept image MIME types
--      (passports, ID pictures, scanned medicals).
--   2. Extend submit_vacancy_application to return a session token
--      alongside the new id, advance step to documents_pending, and
--      stamp session_token + session_expires_at.
--   3. New SECURITY DEFINER RPC submit_application_document for the
--      upload page. Validates the session token before inserting.
--
-- Already applied to Confair_Website via Supabase MCP.

-- ── 1. storage bucket: accept images on top of PDFs/DOCs ──────────────
update storage.buckets
   set allowed_mime_types = array[
     'application/pdf',
     'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'image/jpeg',
     'image/png',
     'image/webp',
     'image/heic',
     'image/heif'
   ],
       file_size_limit = 10 * 1024 * 1024
 where id = 'vacancy-cvs';

-- ── 2. submit_vacancy_application: now returns (id, session_token) ────
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

  v_token := encode(gen_random_bytes(24), 'hex');

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

revoke all on function public.submit_vacancy_application(
  bigint, text, text, text, text, text, text, text, text, text, text, text, integer
) from public;
grant execute on function public.submit_vacancy_application(
  bigint, text, text, text, text, text, text, text, text, text, text, text, integer
) to anon, authenticated;

-- ── 3. submit_application_document: gated insert ──────────────────────
create or replace function public.submit_application_document(
  p_application_id    bigint,
  p_session_token     text,
  p_document_type_id  bigint,
  p_storage_key       text,
  p_filename          text,
  p_mime_type         text,
  p_size_bytes        integer
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc_id bigint;
  v_app    record;
begin
  if p_session_token is null or length(p_session_token) < 16 then
    raise exception 'session_token required';
  end if;
  if p_storage_key is null or length(trim(p_storage_key)) = 0 then
    raise exception 'storage_key required';
  end if;
  if p_filename is null or length(trim(p_filename)) = 0 then
    raise exception 'filename required';
  end if;

  select id, session_token, session_expires_at, function_group_id, step
    into v_app
    from public.vacancy_applications
   where id = p_application_id;

  if v_app is null then
    raise exception 'application not found';
  end if;
  if v_app.session_token is null or v_app.session_token <> p_session_token then
    raise exception 'session_token mismatch';
  end if;
  if v_app.session_expires_at is not null and v_app.session_expires_at < now() then
    raise exception 'session expired';
  end if;

  -- Replace semantics per (application, document_type): drop any
  -- previously-uploaded doc of the same type so the candidate can
  -- correct a wrong upload. Storage cleanup runs in the upload action.
  if p_document_type_id is not null then
    delete from public.vacancy_application_documents
     where application_id = p_application_id
       and document_type_id = p_document_type_id;
  end if;

  insert into public.vacancy_application_documents (
    application_id, document_type_id,
    storage_key, filename, mime_type, size_bytes,
    carerix_push_status
  ) values (
    p_application_id, p_document_type_id,
    p_storage_key, trim(p_filename), p_mime_type, p_size_bytes,
    'pending'
  )
  returning id into v_doc_id;

  -- Mark progress: candidate has started uploading. Step transitions
  -- to 'documents_uploaded' when the verify step submits.
  if v_app.step = 'documents_pending' then
    update public.vacancy_applications
       set step = 'documents_pending'
     where id = p_application_id;
  end if;

  return v_doc_id;
end;
$$;

revoke all on function public.submit_application_document(
  bigint, text, bigint, text, text, text, integer
) from public;
grant execute on function public.submit_application_document(
  bigint, text, bigint, text, text, text, integer
) to anon, authenticated;
