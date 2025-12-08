/*
  # Create User Preferences Table

  1. New Tables
    - `user_preferences`
      - `id` (uuid, primary key) - Unique identifier for preferences record
      - `user_id` (uuid, foreign key, unique) - Reference to the user (one-to-one relationship)
      - `dark_mode` (boolean) - Whether dark mode is enabled
      - `created_at` (timestamptz) - Timestamp when preferences were created
      - `updated_at` (timestamptz) - Timestamp when preferences were last updated

  2. Security
    - Enable RLS on `user_preferences` table
    - Add policy for authenticated users to read their own preferences
    - Add policy for authenticated users to create their own preferences
    - Add policy for authenticated users to update their own preferences

  3. Indexes
    - Create unique index on user_id for one-to-one relationship

  4. Notes
    - Each user can have only one preferences record
    - Default dark mode is false (light mode)
*/

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  dark_mode boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own preferences"
  ON user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);
