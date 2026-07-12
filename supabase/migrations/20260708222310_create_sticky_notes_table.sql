/*
# Create sticky_notes table (single-tenant, no auth)

1. New Tables
- `sticky_notes`
- `id` (uuid, primary key) - unique identifier for each sticky note
- `x` (integer, not null) - x position on the corkboard
- `y` (integer, not null) - y position on the corkboard
- `color` (text, not null) - CSS color class for the sticky note background
- `content` (text) - text content of the sticky note
- `has_pin` (boolean, default false) - whether the note displays a pin decoration
- `items` (jsonb, default '[]') - array of bullet points and checklist items
- `created_at` (timestamp) - when the note was created

2. Security
- Enable RLS on `sticky_notes`.
- Allow anon + authenticated CRUD because the data is intentionally shared/public (single-tenant app with no sign-in).
*/

CREATE TABLE IF NOT EXISTS sticky_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x integer NOT NULL DEFAULT 0,
  y integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT 'bg-yellow-200',
  content text DEFAULT '',
  has_pin boolean NOT NULL DEFAULT false,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sticky_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sticky_notes" ON sticky_notes;
CREATE POLICY "anon_select_sticky_notes" ON sticky_notes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sticky_notes" ON sticky_notes;
CREATE POLICY "anon_insert_sticky_notes" ON sticky_notes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sticky_notes" ON sticky_notes;
CREATE POLICY "anon_update_sticky_notes" ON sticky_notes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sticky_notes" ON sticky_notes;
CREATE POLICY "anon_delete_sticky_notes" ON sticky_notes FOR DELETE
  TO anon, authenticated USING (true);
