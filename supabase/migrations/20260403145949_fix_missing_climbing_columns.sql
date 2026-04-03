/*
  # Fix missing columns in climbing tables

  ## Problem
  The following columns exist in the application code but are missing from the actual Supabase database:
  - `ascents.quality_stars` — star rating (1-5) for route quality
  - `climbing_sessions.weather_temp` — temperature at session time
  - `climbing_sessions.weather_code` — WMO weather code for session conditions

  ## Changes
  1. `ascents` table: add `quality_stars` (integer, nullable, 1-5)
  2. `climbing_sessions` table: add `weather_temp` (integer, nullable), `weather_code` (integer, nullable)

  ## Notes
  - All columns are nullable — no data loss risk
  - Uses IF NOT EXISTS guards to be safe to re-run
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ascents' AND column_name = 'quality_stars'
  ) THEN
    ALTER TABLE ascents ADD COLUMN quality_stars integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'climbing_sessions' AND column_name = 'weather_temp'
  ) THEN
    ALTER TABLE climbing_sessions ADD COLUMN weather_temp integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'climbing_sessions' AND column_name = 'weather_code'
  ) THEN
    ALTER TABLE climbing_sessions ADD COLUMN weather_code integer;
  END IF;
END $$;
