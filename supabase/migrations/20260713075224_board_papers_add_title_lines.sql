/*
# Add title and lines columns to board_papers

Replaces plain `text` with structured `title` + `lines` (jsonb array of PaperLine objects).
Keeps `text` column but adds the new fields so old rows are not broken.
*/

ALTER TABLE board_papers ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE board_papers ADD COLUMN IF NOT EXISTS lines jsonb NOT NULL DEFAULT '[]'::jsonb;
