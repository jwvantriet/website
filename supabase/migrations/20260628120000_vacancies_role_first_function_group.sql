-- Role/function-first vacancy classification.
--
-- Previously the website-vacancy sync guessed `industry` from the title text
-- (defaulting to Aviation), and the function-group trigger keyed off that guess
-- — so maritime/offshore roles whose titles trip aviation keywords (e.g.
-- "ROV Pilot", "Chief Engineer", "DPO") were filed under Aviation, with the
-- wrong (or null) function group.
--
-- This flips the logic: match the title to a function group across ALL verticals
-- (specific maritime/offshore role terms take precedence over the broad aviation
-- terms), then derive BOTH the function group AND the vertical (industry) from
-- that group, recomputed on every insert/update. When no role matches, the
-- sync-provided industry is kept and the group left untouched.

create or replace function public.infer_function_group_by_title(p_title text)
returns bigint language plpgsql stable as $$
declare
  v_title text := lower(coalesce(p_title, ''));
  v_industry text;
  v_slug text;
  v_id bigint;
begin
  -- Maritime — specific deck/engine/rating terms (deliberately NOT bare
  -- "engineer" or "first officer", which are aviation).
  if v_title ~ '(deck officer|master mariner|chief mate|chief officer|2nd officer|second officer|third officer|navigation officer)' then
    v_industry := 'Maritime'; v_slug := 'deck-officer';
  elsif v_title ~ '(marine engineer|chief engineer|2nd engineer|second engineer|third engineer|engineer officer|electro-technical|\yeto\y)' then
    v_industry := 'Maritime'; v_slug := 'marine-engineer';
  elsif v_title ~ '(able seaman|able-bodied|ordinary seaman|deckhand|bosun|\yrating\y|\yab\y)' then
    v_industry := 'Maritime'; v_slug := 'rating';
  -- Offshore
  elsif v_title ~ '(wind|gwo|turbine)' then
    v_industry := 'Offshore'; v_slug := 'wind-technician';
  elsif v_title ~ '(\yhse\y|safety officer)' then
    v_industry := 'Offshore'; v_slug := 'hse-officer';
  elsif v_title ~ '(\yrov\y|\ydpo\y|dynamic positioning|subsea|fpso|drilling|\yrig\y|roustabout|rigger|crane operator|offshore)' then
    v_industry := 'Offshore'; v_slug := 'offshore-technician';
  -- Aviation (last) — bare engineer/mechanic/part-66 + flight crew.
  elsif v_title ~ '(part 66|part-66|\yb1\y|\yb2\y|\yndt\y|mechanic|engineer)' then
    v_industry := 'Aviation'; v_slug := 'engineer';
  elsif v_title ~ '(loadmaster)' then
    v_industry := 'Aviation'; v_slug := 'loadmaster';
  elsif v_title ~ '(cabin crew|cabin attendant|flight attendant|purser|\ycabin\y)' then
    v_industry := 'Aviation'; v_slug := 'cabin-crew';
  elsif v_title ~ '(pilot|captain|first officer|\yfo\y|type rated|type rating|\ytr\y|\yntr\y)' then
    v_industry := 'Aviation'; v_slug := 'pilot';
  end if;

  if v_slug is null then return null; end if;
  select id into v_id from public.function_groups
   where industry = v_industry and slug = v_slug and is_active limit 1;
  return v_id;
end; $$;

-- Trigger: derive function_group_id + industry from the title-matched group.
create or replace function public.vacancies_fill_function_group()
returns trigger language plpgsql as $$
declare
  v_id bigint;
  v_industry text;
begin
  v_id := public.infer_function_group_by_title(NEW.title);
  if v_id is not null then
    NEW.function_group_id := v_id;
    select industry into v_industry from public.function_groups where id = v_id;
    if v_industry is not null then
      NEW.industry := v_industry;
    end if;
  end if;
  return NEW;
end; $$;

-- Backfill existing rows (guarded so the migration is safe in environments that
-- don't have the vacancies table). The BEFORE UPDATE trigger recomputes
-- function_group_id + industry from each title.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'vacancies'
  ) then
    update public.vacancies set title = title;
  end if;
end $$;
