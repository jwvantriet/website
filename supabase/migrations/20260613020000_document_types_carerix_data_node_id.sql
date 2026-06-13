-- Carerix attachment document types are keyed by their numeric dataNodeID
-- ("Document type of attachment" node type); most have no string tag. Store the
-- dataNodeID as the real mapping key. carerix_tag stays for the few that have
-- one, but data_node_id is authoritative.
--
-- Applied to Confair_Website (sntcxllhlwnxxbrzcuxb) via Supabase MCP.
alter table public.document_types
  add column if not exists carerix_data_node_id bigint;

create unique index if not exists document_types_carerix_data_node_id_uq
  on public.document_types (carerix_data_node_id)
  where carerix_data_node_id is not null;
