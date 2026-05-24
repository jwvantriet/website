-- Keyword-based inference of function_group_id from vacancy title +
-- industry. Used during the Carerix sync to attribute newly-pulled
-- vacancies to a function group, and also as a one-shot backfill for
-- existing rows. Once the sync learns to read Carerix's
-- toLevel1FunctionGroup field directly, this becomes a fallback.
--
-- Order matters: engineer/loadmaster/cabin-crew checks come BEFORE pilot
-- so titles like "EASA Part 66 B1 B747 Engineer" don't get pilot-classified
-- by the aircraft-type tokens in the pilot regex.
--
-- Already applied to Confair_Website via Supabase MCP.

create or replace function public.infer_vacancy_function_group(
  p_industry text,
  p_title    text
) returns bigint
language plpgsql
stable
as $$
declare
  v_title text := lower(coalesce(p_title, ''));
  v_slug  text;
  v_id    bigint;
begin
  if p_industry = 'Aviation' then
    if v_title ~ '(engineer|mechanic|part 66|part-66|\mb1\m|\mb2\m|ndt)' then
      v_slug := 'engineer';
    elsif v_title ~ '(loadmaster)' then
      v_slug := 'loadmaster';
    elsif v_title ~ '(cabin crew|cabin attendant|flight attendant|purser|\mcabin\m)' then
      v_slug := 'cabin-crew';
    elsif v_title ~ '(pilot|captain|first officer|\mfo\m|type rated|type rating|\mtr\m|\mntr\m)' then
      v_slug := 'pilot';
    end if;
  elsif p_industry = 'Maritime' then
    if v_title ~ '(deck officer|master mariner|chief mate|second officer|third officer|navigation officer)' then
      v_slug := 'deck-officer';
    elsif v_title ~ '(marine engineer|chief engineer|engineer officer|second engineer|third engineer)' then
      v_slug := 'marine-engineer';
    elsif v_title ~ '(able seaman|rating|deckhand|bosun|ordinary seaman)' then
      v_slug := 'rating';
    end if;
  elsif p_industry = 'Offshore' then
    if v_title ~ '(wind|gwo)' then
      v_slug := 'wind-technician';
    elsif v_title ~ '(hse|safety officer)' then
      v_slug := 'hse-officer';
    elsif v_title ~ '(technician|drilling|rig|subsea|fpso|rov|crane|offshore)' then
      v_slug := 'offshore-technician';
    end if;
  end if;

  if v_slug is null then return null; end if;

  select id into v_id from public.function_groups
   where industry = p_industry and slug = v_slug and is_active
   limit 1;
  return v_id;
end;
$$;

-- One-shot backfill for the rows that landed before this function existed.
update public.vacancies
   set function_group_id = public.infer_vacancy_function_group(industry, title);
