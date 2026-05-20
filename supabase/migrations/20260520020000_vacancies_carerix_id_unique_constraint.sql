-- Replace the partial unique index added in
-- 20260520010000_extend_vacancies_for_carerix.sql with a regular UNIQUE
-- constraint. PostgreSQL's `ON CONFLICT (carerix_id)` cannot match a
-- partial index (`WHERE carerix_id IS NOT NULL`) without a matching
-- predicate — the Carerix sync upsert failed in production with:
--
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
--
-- A plain UNIQUE constraint still allows multiple NULL values (PG treats
-- NULLs as distinct by default), which is the original business intent.

drop index if exists public.vacancies_carerix_id_uq;

alter table public.vacancies
  add constraint vacancies_carerix_id_key unique (carerix_id);
