-- Page-load helper for /apply/[id]/upload.
--
-- Bundles the three reads the page needs (vacancy_applications,
-- function_group_documents joined with document_types, existing
-- vacancy_application_documents) into a single SECURITY DEFINER call
-- so anon doesn't need SELECT policies on the two write-only tables.
-- Validates the session token before returning anything; returns null
-- on mismatch / expired / not found, which the page maps to a 404.
--
-- Return shape: jsonb { application, slots[], uploads[] }.
--
-- Already applied to Confair_Website via Supabase MCP.

create or replace function public.get_apply_upload_view(
  p_application_id bigint,
  p_session_token  text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_app   record;
  v_fg    record;
  v_slots jsonb;
  v_ups   jsonb;
begin
  select id, first_name, last_name, email,
         vacancy_title, vacancy_slug, vacancy_carerix_id,
         function_group_id, step,
         session_token, session_expires_at
    into v_app
    from public.vacancy_applications
   where id = p_application_id;

  if v_app is null then return null; end if;
  if v_app.session_token is null or v_app.session_token <> p_session_token then return null; end if;
  if v_app.session_expires_at is not null and v_app.session_expires_at < now() then return null; end if;

  if v_app.function_group_id is not null then
    select id, name, industry into v_fg
      from public.function_groups
     where id = v_app.function_group_id;
  end if;

  select coalesce(jsonb_agg(s order by s->>'display_order' asc), '[]'::jsonb)
    into v_slots
    from (
      select jsonb_build_object(
        'document_type_id', dt.id,
        'slug',             dt.slug,
        'name',             dt.name,
        'description',      dt.description,
        'is_required',      fgd.is_required,
        'display_order',    fgd.display_order
      ) as s
        from public.function_group_documents fgd
        join public.document_types dt on dt.id = fgd.document_type_id
       where fgd.function_group_id = v_app.function_group_id
    ) t;

  select coalesce(jsonb_agg(jsonb_build_object(
           'document_type_id',    document_type_id,
           'id',                  id,
           'filename',            filename,
           'size_bytes',          size_bytes,
           'carerix_push_status', carerix_push_status,
           'ai_extracted_at',     ai_extracted_at
         )), '[]'::jsonb)
    into v_ups
    from public.vacancy_application_documents
   where application_id = p_application_id;

  return jsonb_build_object(
    'application', jsonb_build_object(
      'id',                       v_app.id,
      'first_name',               v_app.first_name,
      'last_name',                v_app.last_name,
      'email',                    v_app.email,
      'vacancy_title',            v_app.vacancy_title,
      'vacancy_slug',             v_app.vacancy_slug,
      'vacancy_carerix_id',       v_app.vacancy_carerix_id,
      'function_group_id',        v_app.function_group_id,
      'function_group_name',      v_fg.name,
      'function_group_industry',  v_fg.industry,
      'step',                     v_app.step,
      'session_expires_at',       v_app.session_expires_at
    ),
    'slots',   v_slots,
    'uploads', v_ups
  );
end;
$$;

grant execute on function public.get_apply_upload_view(bigint, text) to anon, authenticated;
