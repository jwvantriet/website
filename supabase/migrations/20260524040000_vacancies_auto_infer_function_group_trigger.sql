-- BEFORE INSERT/UPDATE trigger: when function_group_id is left NULL on a
-- vacancy row, infer it from industry + title via the inference function.
-- The Carerix sync upserts don't include function_group_id, so without
-- this trigger every re-sync would clobber the inferred value back to NULL.
--
-- Already applied to Confair_Website via Supabase MCP.

create or replace function public.vacancies_fill_function_group()
returns trigger
language plpgsql
as $$
begin
  if NEW.function_group_id is null then
    NEW.function_group_id := public.infer_vacancy_function_group(NEW.industry, NEW.title);
  end if;
  return NEW;
end;
$$;

drop trigger if exists vacancies_fill_function_group_trg on public.vacancies;
create trigger vacancies_fill_function_group_trg
  before insert or update on public.vacancies
  for each row execute function public.vacancies_fill_function_group();
