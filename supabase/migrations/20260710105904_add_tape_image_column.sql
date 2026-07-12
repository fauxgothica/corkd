-- Add tape_image (user-uploaded tape design) to sticky_notes and board_photos
ALTER TABLE sticky_notes  ADD COLUMN IF NOT EXISTS tape_image TEXT NOT NULL DEFAULT '';
ALTER TABLE board_photos  ADD COLUMN IF NOT EXISTS tape_image TEXT NOT NULL DEFAULT '';
