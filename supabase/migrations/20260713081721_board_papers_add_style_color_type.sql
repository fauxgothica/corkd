/*
# Add paper style/color/type columns to board_papers
*/
ALTER TABLE board_papers ADD COLUMN IF NOT EXISTS paper_style text NOT NULL DEFAULT 'lined';
ALTER TABLE board_papers ADD COLUMN IF NOT EXISTS paper_color text NOT NULL DEFAULT 'cream';
ALTER TABLE board_papers ADD COLUMN IF NOT EXISTS paper_type text NOT NULL DEFAULT 'notepad';
