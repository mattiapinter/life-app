/*
  # Add user profile with height field

  1. New Tables
    - `user_profiles`
      - `user_id` (uuid, primary key, references auth.users)
      - `height_cm` (integer, user height in centimeters)
      - `neck_cm` (numeric, neck circumference for body composition)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_profiles` table
    - Add policy for users to read their own profile
    - Add policy for users to insert their own profile
    - Add policy for users to update their own profile

  3. Notes
    - Height is stored in cm for consistency with other measurements
    - Neck circumference is needed for Navy Method body fat calculation
    - Each user has exactly one profile row
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  height_cm integer NOT NULL DEFAULT 177,
  neck_cm numeric(5,1) DEFAULT 38.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);