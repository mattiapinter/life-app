/*
  # Creazione tabelle climbing complete

  1. Nuove tabelle
    - `crags`: falesie con nome, regione, tipo roccia, coordinate GPS, gradi, stili, esposizione
    - `climbing_sessions`: sessioni di arrampicata con meteo automatico
    - `ascents`: tiri/vie con grado, stile, qualita' stelle
    - `projects`: progetti di via con stato
    - `project_attempts`: tentativi su progetti

  2. Sicurezza
    - RLS abilitato su tutte le tabelle
    - Policy per SELECT, INSERT, UPDATE, DELETE solo per utenti autenticati sui propri dati
*/

-- ── CRAGS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crags (
  id            serial PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT '',
  region        text,
  rock_type     text,
  notes         text,
  lat           numeric,
  lng           numeric,
  grade_min     text,
  grade_max     text,
  approach_min  integer,
  styles        text[],
  gps_url       text,
  exposure      text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE crags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own crags"
  ON crags FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crags"
  ON crags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crags"
  ON crags FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own crags"
  ON crags FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── CLIMBING SESSIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS climbing_sessions (
  id             serial PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date   date NOT NULL,
  crag_id        integer REFERENCES crags(id) ON DELETE SET NULL,
  type           text DEFAULT 'falesia',
  notes          text,
  weather_temp   numeric,
  weather_code   integer,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE climbing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own climbing sessions"
  ON climbing_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own climbing sessions"
  ON climbing_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own climbing sessions"
  ON climbing_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own climbing sessions"
  ON climbing_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── ASCENTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ascents (
  id             serial PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id     integer REFERENCES climbing_sessions(id) ON DELETE CASCADE,
  route_name     text,
  grade          text NOT NULL DEFAULT '6a',
  style          text NOT NULL DEFAULT 'redpoint',
  attempts       integer DEFAULT 1,
  completed      boolean DEFAULT true,
  rpe            integer,
  quality_stars  integer,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE ascents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ascents"
  ON ascents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ascents"
  ON ascents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ascents"
  ON ascents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ascents"
  ON ascents FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── PROJECTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id             serial PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_name     text NOT NULL DEFAULT '',
  grade          text NOT NULL DEFAULT '7a',
  crag_id        integer REFERENCES crags(id) ON DELETE SET NULL,
  status         text DEFAULT 'active',
  notes          text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own projects"
  ON projects FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── PROJECT ATTEMPTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_attempts (
  id             serial PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id     integer REFERENCES projects(id) ON DELETE CASCADE,
  attempt_date   date NOT NULL,
  completed      boolean DEFAULT false,
  progress       text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE project_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own project attempts"
  ON project_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project attempts"
  ON project_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project attempts"
  ON project_attempts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own project attempts"
  ON project_attempts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
