/*
# Create board_images table for regular photos
*/

CREATE TABLE IF NOT EXISTS board_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x float NOT NULL DEFAULT 100,
  y float NOT NULL DEFAULT 100,
  rotation float NOT NULL DEFAULT 0,
  scale float NOT NULL DEFAULT 1,
  image_url text NOT NULL DEFAULT '',
  width float NOT NULL DEFAULT 200,
  height float NOT NULL DEFAULT 240,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE board_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_board_images" ON board_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_board_images" ON board_images FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_board_images" ON board_images FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_board_images" ON board_images FOR DELETE TO anon, authenticated USING (true);
