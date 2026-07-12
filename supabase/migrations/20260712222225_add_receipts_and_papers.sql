/*
# Add board_receipts and board_papers tables

1. New Tables
- `board_receipts` — stores receipt items pinned to the cork board
  - id, x/y position, rotation, scale
  - store_name, logo (emoji), date
  - items (jsonb array of {id, name, qty, price})
  - tax (percentage)
  - decorations: has_pin, has_tape, pin_color, tape_color, tape_image
- `board_papers` — stores sheets of paper pinned to the cork board
  - id, x/y position, rotation, scale
  - text content
  - width/height for per-corner resize
  - decorations: has_pin, has_tape, pin_color, tape_color, tape_image

2. Security
- RLS enabled on both tables
- anon + authenticated CRUD (single-tenant, no auth)
*/

CREATE TABLE IF NOT EXISTS board_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x double precision NOT NULL DEFAULT 100,
  y double precision NOT NULL DEFAULT 100,
  rotation double precision NOT NULL DEFAULT 0,
  scale double precision NOT NULL DEFAULT 1,
  store_name text NOT NULL DEFAULT '',
  logo text NOT NULL DEFAULT '🛒',
  date text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax double precision NOT NULL DEFAULT 0,
  has_pin boolean NOT NULL DEFAULT false,
  has_tape boolean NOT NULL DEFAULT false,
  pin_color text NOT NULL DEFAULT '#d8c35a',
  tape_color text NOT NULL DEFAULT '#fef08a',
  tape_image text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE board_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_receipts" ON board_receipts;
CREATE POLICY "anon_select_receipts" ON board_receipts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_receipts" ON board_receipts;
CREATE POLICY "anon_insert_receipts" ON board_receipts FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_receipts" ON board_receipts;
CREATE POLICY "anon_update_receipts" ON board_receipts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_receipts" ON board_receipts;
CREATE POLICY "anon_delete_receipts" ON board_receipts FOR DELETE TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS board_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x double precision NOT NULL DEFAULT 100,
  y double precision NOT NULL DEFAULT 100,
  rotation double precision NOT NULL DEFAULT 0,
  scale double precision NOT NULL DEFAULT 1,
  text text NOT NULL DEFAULT '',
  width double precision NOT NULL DEFAULT 280,
  height double precision NOT NULL DEFAULT 360,
  has_pin boolean NOT NULL DEFAULT false,
  has_tape boolean NOT NULL DEFAULT false,
  pin_color text NOT NULL DEFAULT '#d8c35a',
  tape_color text NOT NULL DEFAULT '#fef08a',
  tape_image text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE board_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_papers" ON board_papers;
CREATE POLICY "anon_select_papers" ON board_papers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_papers" ON board_papers;
CREATE POLICY "anon_insert_papers" ON board_papers FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_papers" ON board_papers;
CREATE POLICY "anon_update_papers" ON board_papers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_papers" ON board_papers;
CREATE POLICY "anon_delete_papers" ON board_papers FOR DELETE TO anon, authenticated USING (true);
