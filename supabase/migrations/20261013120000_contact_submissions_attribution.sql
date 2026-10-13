-- First-touch marketing attribution on contact-form and salary-guide leads.
--
-- Until October 2026 attribution was only forwarded to HubSpot; the
-- contact_submissions row never held it. HubSpot has been removed (Apollo is
-- now the sales system, and its contacts carry no UTM data), so without this
-- column the campaign that produced a lead would be lost entirely.
--
-- Additive and nullable: safe to apply before the code that writes it. The
-- existing anon INSERT policy (with check true) covers the new column.

alter table public.contact_submissions
  add column if not exists attribution jsonb;

comment on column public.contact_submissions.attribution is
  'First-touch marketing attribution captured from the confair_attribution cookie (utm_*, referrer, landing_page). Null when the visitor arrived direct or declined marketing cookies.';
