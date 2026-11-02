-- Recruitment requirements, phase 1: "most specific wins" + "not asked", and a
-- vacancy function group a recruiter can set.
--
-- 1. is_excluded on the three document-requirement layers. Requirements merge
--    function group → company (company-wide, then per function group) →
--    vacancy, and the most specific layer that names a document now decides
--    (confair-api match_requirements.mergeDocumentRequirements). is_excluded =
--    "not asked here": a vacancy can switch off what the function group or the
--    client asks for — e.g. a Type Rating Certificate on an NTR (non-type-rated)
--    vacancy, which on 2026-11-02 held 66 of 72 NTR applications in group 1.
--    Before this, "required" in any layer won and a vacancy could only add.
-- 2. vacancies.function_group_manual: when true, the title trigger leaves
--    function_group_id alone. The trigger re-derived the group from the title
--    on every update, so a recruiter could not correct it.
--
-- Additive (defaults false = today's behaviour); safe ahead of the API deploy.

alter table public.function_group_documents      add column if not exists is_excluded boolean not null default false;
alter table public.company_document_requirements add column if not exists is_excluded boolean not null default false;
alter table public.vacancy_document_requirements add column if not exists is_excluded boolean not null default false;

alter table public.vacancies add column if not exists function_group_manual boolean not null default false;

create or replace function public.vacancies_fill_function_group()
returns trigger language plpgsql as $$
declare
  v_id bigint;
  v_industry text;
begin
  -- Set by a recruiter: keep it (and its industry).
  if NEW.function_group_manual then
    if NEW.function_group_id is not null then
      select industry into v_industry from public.function_groups where id = NEW.function_group_id;
      if v_industry is not null then NEW.industry := v_industry; end if;
    end if;
    return NEW;
  end if;
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

notify pgrst, 'reload schema';
