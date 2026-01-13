-- Migration: Add YouTube as valid source type
-- Date: 2026-01-13
-- Description: Updates the knowledge_entries table constraint to include 'youtube'
--              This fixes the issue where YouTube entries cannot be saved to the database

-- Drop the old constraint that only allows ('twitter', 'blog', 'other')
ALTER TABLE public.knowledge_entries 
DROP CONSTRAINT IF EXISTS knowledge_entries_source_type_check;

-- Add new constraint with 'youtube' included
ALTER TABLE public.knowledge_entries
ADD CONSTRAINT knowledge_entries_source_type_check 
CHECK (source_type IN ('twitter', 'blog', 'youtube', 'other'));
