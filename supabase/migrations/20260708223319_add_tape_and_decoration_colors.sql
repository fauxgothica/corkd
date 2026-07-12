/*
# Add washi tape and decoration color columns to sticky_notes

1. Modified Tables
- `sticky_notes`
- Added `has_tape` (boolean, default false) - whether a washi tape decoration is shown
- Added `pin_color` (text, default '#ef4444') - hex color for the pin SVG
- Added `tape_color` (text, default '#f7bfd9') - hex color for the washi tape SVG

2. Notes
- All new columns are nullable or have safe defaults so existing rows are unaffected.
- No policies change — same anon + authenticated CRUD remains in effect.
*/

ALTER TABLE sticky_notes
  ADD COLUMN IF NOT EXISTS has_tape boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_color text NOT NULL DEFAULT '#ef4444',
  ADD COLUMN IF NOT EXISTS tape_color text NOT NULL DEFAULT '#f7bfd9';
