-- Migration: Add 'substack' as a valid source_type
-- Date: 2026-05-24

-- Drop the existing constraint
ALTER TABLE public.knowledge_entries
DROP CONSTRAINT IF EXISTS knowledge_entries_source_type_check;

-- Re-add with 'substack' included
ALTER TABLE public.knowledge_entries
ADD CONSTRAINT knowledge_entries_source_type_check
CHECK (source_type IN ('twitter', 'blog', 'youtube', 'substack', 'other'));
