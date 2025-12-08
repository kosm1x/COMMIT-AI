/*
  # Create Mind Maps Table

  1. New Tables
    - `mind_maps`
      - `id` (uuid, primary key) - Unique identifier for each mind map
      - `user_id` (uuid, foreign key) - Reference to the user who created the mind map
      - `title` (text) - Title or name of the mind map
      - `problem_statement` (text) - Original problem or challenge described by the user
      - `mermaid_syntax` (text) - Generated Mermaid diagram syntax
      - `created_at` (timestamptz) - Timestamp when the mind map was created
      - `updated_at` (timestamptz) - Timestamp when the mind map was last updated

  2. Security
    - Enable RLS on `mind_maps` table
    - Add policy for authenticated users to read their own mind maps
    - Add policy for authenticated users to create their own mind maps
    - Add policy for authenticated users to update their own mind maps
    - Add policy for authenticated users to delete their own mind maps

  3. Indexes
    - Create index on user_id for efficient querying
    - Create index on created_at for sorting by date
*/

CREATE TABLE IF NOT EXISTS mind_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT '',
  problem_statement text NOT NULL,
  mermaid_syntax text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own mind maps"
  ON mind_maps
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mind maps"
  ON mind_maps
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mind maps"
  ON mind_maps
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mind maps"
  ON mind_maps
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS mind_maps_user_id_idx ON mind_maps(user_id);
CREATE INDEX IF NOT EXISTS mind_maps_created_at_idx ON mind_maps(created_at DESC);
