-- Add rotation to sticky_notes
ALTER TABLE sticky_notes ADD COLUMN IF NOT EXISTS rotation INTEGER NOT NULL DEFAULT 0;

-- Extend board_photos with caption, decorations, and dynamic slot count
ALTER TABLE board_photos
  ADD COLUMN IF NOT EXISTS caption    TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS has_pin    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_tape   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pin_color  TEXT    NOT NULL DEFAULT '#d8c35a',
  ADD COLUMN IF NOT EXISTS tape_color TEXT    NOT NULL DEFAULT '#fef08a',
  ADD COLUMN IF NOT EXISTS slot_count INTEGER NOT NULL DEFAULT 3;
