-- get_apply_upload_view: offer every document the application REQUIRES, not
-- only the function group's set.
--
-- 2026-11-03. The slots came from function_group_documents alone, while what
-- an application is held to (confair-api services/match_requirements.js →
-- mergeDocumentRequirements) is layered: function group → company (all its
-- vacancies, then its rule for this function group) → vacancy, the most
-- specific layer that names a document deciding, `is_excluded` removing it.
-- All four A330 vacancies (348–351) require a Reference letter that the Pilot
-- group does not list, so 28 candidates in stage group 1 were asked for a
-- document this page never offered (and the completion emails told them to
-- upload it). The dashboard's upload list was fixed the same day in
-- confair-api (candidateDocumentSlots); this is the same rule for the site.
--
-- Also now dropped, as the API drops them: excluded rows (the old query never
-- read is_excluded), inactive document types, and types with no Carerix
-- node (nothing uploaded against them can reach Carerix). On 2026-11-03 no
-- function_group_documents row was any of those, so no slot disappears.
--
-- The session checks are the live ones, including the 2026-10-27 NULL-token
-- fix (20261027120000). The response shape is unchanged.

create or replace function public.get_apply_upload_view(p_application_id bigint, p_session_token text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_app   record;
  v_fg    record;
  v_co    text;
  v_slots jsonb;
  v_ups   jsonb;
begin
  select id, first_name, last_name, email,
         vacancy_title, vacancy_slug, vacancy_carerix_id,
         function_group_id, step,
         session_token, session_expires_at,
         carerix_response
    into v_app
    from public.vacancy_applications
   where id = p_application_id;

  if v_app is null then return null; end if;
  if p_session_token is null or v_app.session_token is null or v_app.session_token is distinct from p_session_token then return null; end if;
  if v_app.session_expires_at is not null and v_app.session_expires_at < now() then return null; end if;

  if v_app.function_group_id is not null then
    select id, name, industry into v_fg
      from public.function_groups
     where id = v_app.function_group_id;
  end if;

  -- The vacancy's client: the key company_document_requirements uses.
  if v_app.vacancy_carerix_id is not null then
    select carerix_company_id::text into v_co
      from public.vacancies
     where carerix_id::text = v_app.vacancy_carerix_id::text
     limit 1;
  end if;

  with layers as (
    -- layer: 1 function group, 2 company-wide, 3 company × this group, 4 vacancy.
    select 1 as layer, document_type_id, is_required, coalesce(is_excluded, false) as is_excluded, display_order
      from public.function_group_documents
     where v_app.function_group_id is not null and function_group_id = v_app.function_group_id
    union all
    select case when function_group_id = 0 then 2 else 3 end, document_type_id, is_required, coalesce(is_excluded, false), display_order
      from public.company_document_requirements
     where v_co is not null and carerix_company_id::text = v_co
       and (function_group_id = 0 or function_group_id = v_app.function_group_id)
    union all
    select 4, document_type_id, is_required, coalesce(is_excluded, false), display_order
      from public.vacancy_document_requirements
     where v_app.vacancy_carerix_id is not null and vacancy_carerix_id::text = v_app.vacancy_carerix_id::text
  ),
  decided as (
    -- The most specific layer that names a document decides its state...
    select distinct on (document_type_id) document_type_id, is_required, is_excluded
      from layers
     order by document_type_id, layer desc
  ),
  positioned as (
    -- ...and the first layer that names it keeps its position, so a vacancy
    -- override does not reorder the list.
    select distinct on (document_type_id) document_type_id, display_order
      from layers
     order by document_type_id, layer asc
  )
  select coalesce(jsonb_agg(s order by (s->>'display_order')::int asc nulls last), '[]'::jsonb)
    into v_slots
    from (
      select jsonb_build_object(
        'document_type_id', dt.id,
        'slug',             dt.slug,
        'name',             dt.name,
        'description',      dt.description,
        'is_required',      coalesce(d.is_required, false),
        'display_order',    coalesce(p.display_order, 0)
      ) as s
        from decided d
        join positioned p on p.document_type_id = d.document_type_id
        join public.document_types dt on dt.id = d.document_type_id
       where not d.is_excluded
         and dt.is_active is not false
         and dt.carerix_data_node_id is not null
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
      'carerix_employee_id',      v_app.carerix_response ->> 'employeeId',
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
$function$;
