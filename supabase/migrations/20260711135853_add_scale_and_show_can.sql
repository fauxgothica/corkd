-- Add scale to sticky_notes and board_photos; add show_can to board_photos
ALTER TABLE sticky_notes ADD COLUMN IF NOT EXISTS scale DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE board_photos ADD COLUMN IF NOT EXISTS scale DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE board_photos ADD COLUMN IF NOT EXISTS show_can BOOLEAN NOT NULL DEFAULT false;
