/*
# Create keyrings and keychains tables
*/

CREATE TABLE IF NOT EXISTS keyrings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x float NOT NULL DEFAULT 100,
  y float NOT NULL DEFAULT 100,
  color text NOT NULL DEFAULT '#4ade80',
  locked boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS keychains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x float NOT NULL DEFAULT 200,
  y float NOT NULL DEFAULT 200,
  image_url text NOT NULL DEFAULT '',
  attached_ring_id uuid REFERENCES keyrings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE keyrings ENABLE ROW LEVEL SECURITY;
ALTER TABLE keychains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_keyrings" ON keyrings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_keyrings" ON keyrings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_keyrings" ON keyrings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_keyrings" ON keyrings FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "select_keychains" ON keychains FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_keychains" ON keychains FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_keychains" ON keychains FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_keychains" ON keychains FOR DELETE TO anon, authenticated USING (true);
