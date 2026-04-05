-- Composite index for common list query: filter by user, order by recency
create index if not exists knowledge_entries_user_created_idx
  on public.knowledge_entries (user_id, created_at desc);

-- Supports filtering by source_type under the same user ordering
create index if not exists knowledge_entries_user_source_created_idx
  on public.knowledge_entries (user_id, source_type, created_at desc);
