ALTER TABLE board_images ADD COLUMN IF NOT EXISTS has_border boolean NOT NULL DEFAULT false;
ALTER TABLE board_images ADD COLUMN IF NOT EXISTS border_color text NOT NULL DEFAULT '#000000';
ALTER TABLE board_images ADD COLUMN IF NOT EXISTS has_frame boolean NOT NULL DEFAULT false;
ALTER TABLE board_images ADD COLUMN IF NOT EXISTS frame_style text NOT NULL DEFAULT 'wood';
ALTER TABLE board_images ADD COLUMN IF NOT EXISTS has_filter boolean NOT NULL DEFAULT false;
ALTER TABLE board_images ADD COLUMN IF NOT EXISTS filter_style text NOT NULL DEFAULT 'sepia';
ALTER TABLE board_images ADD COLUMN IF NOT EXISTS has_texture boolean NOT NULL DEFAULT false;
ALTER TABLE board_images ADD COLUMN IF NOT EXISTS texture_style text NOT NULL DEFAULT 'canvas';
