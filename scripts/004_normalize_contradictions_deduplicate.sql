-- Migration: Normalize contradiction pairs and enforce uniqueness
-- Date: 2026-02-11
-- Description:
--   1) Canonicalize item pairs so item1_id < item2_id
--   2) Remove duplicate contradiction rows (same user + pair + normalized description)
--   3) Add integrity and uniqueness constraints for idempotent inserts

-- Canonicalize pair ordering
UPDATE public.contradictions
SET item1_id = item2_id,
    item2_id = item1_id
WHERE item1_id > item2_id;

-- Remove duplicates while keeping the earliest row
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, item1_id, item2_id, lower(btrim(description))
      ORDER BY created_at ASC, id ASC
    ) AS row_num
  FROM public.contradictions
)
DELETE FROM public.contradictions c
USING ranked r
WHERE c.id = r.id
  AND r.row_num > 1;

-- Guard against self-contradictions
ALTER TABLE public.contradictions
DROP CONSTRAINT IF EXISTS contradictions_distinct_items_check;

ALTER TABLE public.contradictions
ADD CONSTRAINT contradictions_distinct_items_check
CHECK (item1_id <> item2_id);

-- Enforce uniqueness for canonical pair + normalized description
CREATE UNIQUE INDEX IF NOT EXISTS contradictions_user_pair_description_uniq
ON public.contradictions (user_id, item1_id, item2_id, (lower(btrim(description))));

-- Helpful lookup index for pair queries
CREATE INDEX IF NOT EXISTS contradictions_user_pair_idx
ON public.contradictions (user_id, item1_id, item2_id);

