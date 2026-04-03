/*
  # Add exposure column to crags table

  1. Changes
    - Add `exposure` column to `crags` table (text, nullable)
    - Stores compass direction (N, NE, E, SE, S, SW, O, NO)
  
  2. Notes
    - Column is nullable as not all crags may have exposure data
    - Uses IF NOT EXISTS to prevent errors if column already exists
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crags' AND column_name = 'exposure'
  ) THEN
    ALTER TABLE crags ADD COLUMN exposure text;
  END IF;
END $$;