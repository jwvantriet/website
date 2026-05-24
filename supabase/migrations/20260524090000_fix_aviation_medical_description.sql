-- Copy fix: Aviation Medical previously read 'Class 1 / 2 / Cabin medical
-- certificate', which leaked the Cabin Crew variant into the Pilot/Engineer
-- view. Cabin Medical is its own document_type with its own description.
--
-- Already applied to Confair_Website via Supabase MCP.

update public.document_types
   set description = 'Class 1 or Class 2 medical certificate'
 where slug = 'aviation-medical';

update public.document_types
   set description = 'Cabin Crew medical certificate'
 where slug = 'cabin-medical';
