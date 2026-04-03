/*
  # Add notes column to ascents table

  1. Changes
    - `ascents`: new column `notes` (text, nullable) for pitch-specific notes
  
  2. Notes
    - Notes are only meaningful for non-repetition ascents (enforced in UI, not DB)
    - No default value; null means no note
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ascents' AND column_name = 'notes'
  ) THEN
    ALTER TABLE ascents ADD COLUMN notes text;
  END IF;
END $$;
