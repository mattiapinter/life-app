/*
  # Change exposure column to array type

  1. Changes
    - Convert `exposure` column in `crags` table from text to text array
    - This allows storing multiple compass directions per crag
  
  2. Notes
    - Drops existing column and recreates as array
    - Existing data will be lost (column is currently empty/null)
*/

DO $$
BEGIN
  ALTER TABLE crags DROP COLUMN IF EXISTS exposure;
  ALTER TABLE crags ADD COLUMN exposure text[];
END $$;