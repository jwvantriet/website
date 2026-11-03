-- Whether a document type carries an expiry the group-1 gate enforces.
--
-- Until now this was a list in confair-api (match_requirements.js
-- EXPIRING_DOC_SLUGS), so a new expiring type (a visa, a new medical) was
-- never held for its date until someone edited code. It is now a property of
-- the type, set in Recruitment setup → Document types. Seeded from that list.
-- confair-api falls back to its list when this column cannot be read.

alter table public.document_types
  add column if not exists has_expiry boolean not null default false;

update public.document_types set has_expiry = true where slug in (
  'passport', 'type-rating-certificate', 'aviation-medical', 'cabin-medical',
  'maritime-medical', 'offshore-medical', 'stcw-certificate', 'bosiet-huet',
  'gwo-certificate', 'seafarers-book', 'marine-engineer-licence',
  'easa-part-66', 'dangerous-goods'
);

notify pgrst, 'reload schema';
