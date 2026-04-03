/*
  # Add notes column to projects table

  ## Problem
  The projects table is missing the `notes` column that the app code tries to insert,
  causing project saves to fail silently.

  ## Changes
  - `projects` table: add `notes` (text, nullable)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'notes'
  ) THEN
    ALTER TABLE projects ADD COLUMN notes text;
  END IF;
END $$;
