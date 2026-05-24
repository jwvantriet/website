-- Seed function groups + document types + the required/optional matrix
-- per group. Aviation mirrors the legacy Minggo configuration; Maritime
-- and Offshore are sensible defaults that the agency will refine.
--
-- Already applied to Confair_Website via Supabase MCP.

insert into public.function_groups (industry, slug, name, display_order) values
  ('Aviation', 'pilot',         'Pilot',          10),
  ('Aviation', 'cabin-crew',    'Cabin Crew',     20),
  ('Aviation', 'engineer',      'Engineer',       30),
  ('Aviation', 'loadmaster',    'Loadmaster',     40),
  ('Maritime', 'deck-officer',  'Deck Officer',   10),
  ('Maritime', 'marine-engineer','Marine Engineer', 20),
  ('Maritime', 'rating',        'Rating',         30),
  ('Offshore', 'offshore-technician', 'Offshore Technician', 10),
  ('Offshore', 'wind-technician',     'Wind Turbine Technician (GWO)', 20),
  ('Offshore', 'hse-officer',         'HSE Officer', 30);

insert into public.document_types (slug, name, description, carerix_tag, display_order) values
  ('cv',                       'CV',                       'Curriculum vitae / resume',                'CVTag',                  10),
  ('passport',                 'Passport',                 'Passport bio page',                        'PassportTag',            20),
  ('id-picture',               'ID Picture',               'Recent passport-style photo',              'IDPictureTag',           30),
  ('flight-licence',           'Flight Licence',           'EASA / FAA pilot licence',                 'FlightLicenceTag',       40),
  ('licence-verification',     'Licence Verification',     'Licence verification letter',              'LicenceVerificationTag', 50),
  ('type-rating-certificate',  'Type Rating Certificate',  'Type-rating endorsement',                  'TypeRatingTag',          60),
  ('logbook',                  'Logbook',                  'Flight or operations logbook',             'LogbookTag',             70),
  ('aviation-medical',         'Aviation Medical',         'Class 1 / 2 / Cabin medical certificate',  'AviationMedicalTag',     80),
  ('cabin-attestation',        'Cabin Attestation',        'Cabin crew attestation',                   'CabinAttestationTag',    90),
  ('cabin-medical',            'Cabin Medical',            'Cabin crew medical',                       'CabinMedicalTag',       100),
  ('wetdrill',                 'Wetdrill Certificate',     'Wetdrill / emergency training',            'WetdrillTag',           110),
  ('training-agreement',       'Training Agreement',       'Type training / bond agreement',           'TrainingAgreementTag',  120),
  ('human-factor-training',    'Human Factor Training',    'HF / CRM training certificate',            'HumanFactorTag',        130),
  ('benchmark-report',         'Benchmark Report',         'Selection / benchmark assessment report',  'BenchmarkReportTag',    140),
  ('selection-report',         'Selection Report',         'Selection assessment report',              'SelectionReportTag',    150),
  ('stcw-certificate',         'STCW Certificate',         'STCW basic / advanced safety training',    'STCWTag',               200),
  ('seafarers-book',           'Seafarer''s Book',         'Seafarer''s discharge book',               'SeafarersBookTag',      210),
  ('maritime-medical',         'Maritime Medical',         'ENG1 / equivalent maritime medical',       'MaritimeMedicalTag',    220),
  ('marine-engineer-licence',  'Marine Engineer Licence',  'Marine engineer certificate of competency','MarineEngineerLicTag',  230),
  ('bosiet-huet',              'BOSIET / HUET',            'Offshore safety / helicopter underwater escape', 'BOSIETTag',     300),
  ('gwo-certificate',          'GWO Certificate',          'Global Wind Organisation BST / BTT',       'GWOTag',                310),
  ('offshore-medical',         'Offshore Medical',         'Offshore medical (e.g. OGUK)',             'OffshoreMedicalTag',    320);

with map(industry_slug, fg_slug, doc_slug, req, ord) as (values
  ('Aviation','pilot','cv',                       true,  10),
  ('Aviation','pilot','passport',                 true,  20),
  ('Aviation','pilot','id-picture',               true,  30),
  ('Aviation','pilot','flight-licence',           true,  40),
  ('Aviation','pilot','type-rating-certificate',  true,  50),
  ('Aviation','pilot','logbook',                  true,  60),
  ('Aviation','pilot','aviation-medical',         true,  70),
  ('Aviation','pilot','licence-verification',     false, 80),
  ('Aviation','pilot','benchmark-report',         false, 90),
  ('Aviation','pilot','selection-report',         false, 100),

  ('Aviation','cabin-crew','cv',                  true,  10),
  ('Aviation','cabin-crew','passport',            true,  20),
  ('Aviation','cabin-crew','id-picture',          true,  30),
  ('Aviation','cabin-crew','cabin-attestation',   true,  40),
  ('Aviation','cabin-crew','cabin-medical',       true,  50),
  ('Aviation','cabin-crew','wetdrill',            false, 60),
  ('Aviation','cabin-crew','selection-report',    false, 70),

  ('Aviation','engineer','cv',                    true,  10),
  ('Aviation','engineer','passport',              true,  20),
  ('Aviation','engineer','id-picture',            true,  30),
  ('Aviation','engineer','type-rating-certificate', true, 40),
  ('Aviation','engineer','aviation-medical',      true,  50),
  ('Aviation','engineer','logbook',               false, 60),
  ('Aviation','engineer','training-agreement',    false, 70),
  ('Aviation','engineer','human-factor-training', false, 80),

  ('Aviation','loadmaster','cv',                  true,  10),
  ('Aviation','loadmaster','passport',            true,  20),
  ('Aviation','loadmaster','id-picture',          true,  30),
  ('Aviation','loadmaster','logbook',             true,  40),
  ('Aviation','loadmaster','training-agreement',  false, 50),

  ('Maritime','deck-officer','cv',                true,  10),
  ('Maritime','deck-officer','passport',          true,  20),
  ('Maritime','deck-officer','id-picture',        true,  30),
  ('Maritime','deck-officer','stcw-certificate',  true,  40),
  ('Maritime','deck-officer','maritime-medical',  true,  50),
  ('Maritime','deck-officer','seafarers-book',    false, 60),

  ('Maritime','marine-engineer','cv',             true,  10),
  ('Maritime','marine-engineer','passport',       true,  20),
  ('Maritime','marine-engineer','id-picture',     true,  30),
  ('Maritime','marine-engineer','marine-engineer-licence', true, 40),
  ('Maritime','marine-engineer','stcw-certificate',true,  50),
  ('Maritime','marine-engineer','maritime-medical',true,  60),
  ('Maritime','marine-engineer','seafarers-book', false, 70),

  ('Maritime','rating','cv',                      true,  10),
  ('Maritime','rating','passport',                true,  20),
  ('Maritime','rating','id-picture',              true,  30),
  ('Maritime','rating','stcw-certificate',        true,  40),
  ('Maritime','rating','maritime-medical',        true,  50),
  ('Maritime','rating','seafarers-book',          false, 60),

  ('Offshore','offshore-technician','cv',         true,  10),
  ('Offshore','offshore-technician','passport',   true,  20),
  ('Offshore','offshore-technician','id-picture', true,  30),
  ('Offshore','offshore-technician','bosiet-huet',true,  40),
  ('Offshore','offshore-technician','offshore-medical', true, 50),

  ('Offshore','wind-technician','cv',             true,  10),
  ('Offshore','wind-technician','passport',       true,  20),
  ('Offshore','wind-technician','id-picture',     true,  30),
  ('Offshore','wind-technician','gwo-certificate',true,  40),
  ('Offshore','wind-technician','offshore-medical', true, 50),
  ('Offshore','wind-technician','bosiet-huet',    false, 60),

  ('Offshore','hse-officer','cv',                 true,  10),
  ('Offshore','hse-officer','passport',           true,  20),
  ('Offshore','hse-officer','id-picture',         true,  30),
  ('Offshore','hse-officer','offshore-medical',   true,  40),
  ('Offshore','hse-officer','bosiet-huet',        false, 50)
)
insert into public.function_group_documents (function_group_id, document_type_id, is_required, display_order)
select fg.id, dt.id, m.req, m.ord
  from map m
  join public.function_groups fg on fg.industry = m.industry_slug and fg.slug = m.fg_slug
  join public.document_types  dt on dt.slug = m.doc_slug;
