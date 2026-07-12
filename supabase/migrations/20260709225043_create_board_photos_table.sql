/*
# Create board_photos table (single-tenant, no auth)

1. New Tables
- `board_photos`
- `id` (uuid, primary key)
- `kind` (text: 'polaroid1' | 'polaroid2' | 'photostrip' — which frame template)
- `x` (integer, left position in px)
- `y` (integer, top position in px)
- `rotation` (integer, random rotation in degrees, default 0)
- `photo_urls` (jsonb, array of image URLs the user picked for each slot; empty = no photos yet)
- `created_at` (timestamp)
2. Security
- Enable RLS on `board_photos`.
- Allow anon + authenticated CRUD because the data is intentionally shared/public (no sign-in app).
*/

CREATE TABLE IF NOT EXISTS board_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'polaroid1',
  x integer NOT NULL DEFAULT 0,
  y integer NOT NULL DEFAULT 0,
  rotation integer NOT NULL DEFAULT 0,
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE board_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_photos" ON board_photos;
CREATE POLICY "anon_select_photos" ON board_photos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_photos" ON board_photos;
CREATE POLICY "anon_insert_photos" ON board_photos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_photos" ON board_photos;
CREATE POLICY "anon_update_photos" ON board_photos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_photos" ON board_photos;
CREATE POLICY "anon_delete_photos" ON board_photos FOR DELETE
  TO anon, authenticated USING (true);
