-- Document corpus — a local store of pilot licence & medical documents harvested
-- from Carerix, with their AI-extracted fields + per-field confidence. Used to
-- (1) study the variety of document types/issuers we actually receive, and
-- (2) drive confidence-gated write-back of recognised fields into Carerix.
--
-- Binaries are kept in the private `document-corpus` storage bucket (sensitive
-- PII); this table holds the metadata + extraction. Written by confair-api with
-- the service role. RLS on, no policy (service-role only).
-- Applied to Confair_Website via Supabase MCP.

create table if not exists public.document_corpus (
  id                    uuid primary key default gen_random_uuid(),

  -- provenance in Carerix
  carerix_employee_id   text not null,
  carerix_attachment_id text not null,
  carerix_data_node_id  bigint,
  document_type_slug    text,                 -- flight-licence / aviation-medical / …
  function_group        text,                 -- e.g. 'Pilots' (the harvest scope)

  -- the file
  filename              text,
  mime_type             text,
  size_bytes            bigint,
  content_hash          text,                 -- sha256 of the binary, for dedupe
  storage_key           text,                 -- path within the document-corpus bucket

  -- extraction
  extracted             jsonb,                -- raw model field output
  field_confidence      jsonb,                -- { field: 0..1 }
  overall_confidence    numeric,              -- min confidence across populated fields
  extract_path          text,                 -- which attempt won (image / pdf-text / …)
  extract_model         text,
  extract_error         text,

  -- study / clustering (populated in the analysis phase)
  issuing_country       text,
  authority             text,
  layout_variant        text,

  -- confidence-gated write-back (populated in the write-back phase)
  writeback_status      text not null default 'pending'
                          check (writeback_status in ('pending','review','written','skipped','error')),
  writeback_fields      jsonb,                -- the values actually written / proposed
  writeback_at          timestamptz,
  writeback_by          uuid,

  harvested_at          timestamptz not null default now(),
  extracted_at          timestamptz,

  unique (carerix_attachment_id)
);

create index if not exists document_corpus_emp_idx       on public.document_corpus (carerix_employee_id);
create index if not exists document_corpus_slug_idx      on public.document_corpus (document_type_slug);
create index if not exists document_corpus_country_idx   on public.document_corpus (issuing_country);
create index if not exists document_corpus_writeback_idx on public.document_corpus (writeback_status);

alter table public.document_corpus enable row level security;
-- No policies: only the confair-api service role reads/writes this table.

-- Private bucket for the harvested document binaries (sensitive PII). Access is
-- service-role only via confair-api; no public/anon policies are granted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'document-corpus',
  'document-corpus',
  false,
  15 * 1024 * 1024,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;
