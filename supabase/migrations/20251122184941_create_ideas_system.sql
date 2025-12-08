/*
  # Ideas System - Database Schema

  ## Overview
  Creates the database structure for the Ideate section, supporting AI-powered idea
  generation, connections, and suggestions.

  ## New Tables

  ### ideas
  Stores user-generated ideas with AI completions and metadata
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `title` (text) - Brief idea title
  - `content` (text) - Full idea content
  - `initial_input` (text) - Original minimal input from user
  - `category` (text) - AI-assigned category
  - `tags` (jsonb) - Array of tags
  - `status` (text) - draft, active, completed, archived
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### idea_connections
  Stores relationships between ideas
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `idea_id` (uuid, references ideas)
  - `connected_idea_id` (uuid, references ideas)
  - `connection_type` (text) - similar, complementary, prerequisite, related
  - `strength` (integer) - Connection strength 1-100
  - `is_ai_generated` (boolean) - Whether connection was AI-suggested
  - `created_at` (timestamptz)

  ### idea_ai_suggestions
  Stores AI-generated suggestions and completions for ideas
  - `id` (uuid, primary key)
  - `idea_id` (uuid, references ideas)
  - `user_id` (uuid, references auth.users)
  - `suggestion_type` (text) - completion, enhancement, connection, category
  - `content` (text) - The suggestion content
  - `applied` (boolean) - Whether user accepted the suggestion
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Policies for SELECT, INSERT, UPDATE, DELETE operations
*/

CREATE TABLE IF NOT EXISTS ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text DEFAULT '' NOT NULL,
  initial_input text DEFAULT '' NOT NULL,
  category text DEFAULT 'general',
  tags jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS idea_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  idea_id uuid REFERENCES ideas(id) ON DELETE CASCADE NOT NULL,
  connected_idea_id uuid REFERENCES ideas(id) ON DELETE CASCADE NOT NULL,
  connection_type text DEFAULT 'related' CHECK (connection_type IN ('similar', 'complementary', 'prerequisite', 'related')),
  strength integer DEFAULT 50 CHECK (strength >= 1 AND strength <= 100),
  is_ai_generated boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT different_ideas CHECK (idea_id != connected_idea_id)
);

CREATE TABLE IF NOT EXISTS idea_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid REFERENCES ideas(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  suggestion_type text DEFAULT 'completion' CHECK (suggestion_type IN ('completion', 'enhancement', 'connection', 'category')),
  content text NOT NULL,
  applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_idea_connections_user_id ON idea_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_connections_idea_id ON idea_connections(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_connections_connected_idea_id ON idea_connections(connected_idea_id);

CREATE INDEX IF NOT EXISTS idx_idea_ai_suggestions_idea_id ON idea_ai_suggestions(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_ai_suggestions_user_id ON idea_ai_suggestions(user_id);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ideas"
  ON ideas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ideas"
  ON ideas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ideas"
  ON ideas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ideas"
  ON ideas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own idea connections"
  ON idea_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own idea connections"
  ON idea_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own idea connections"
  ON idea_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own idea connections"
  ON idea_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own AI suggestions"
  ON idea_ai_suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI suggestions"
  ON idea_ai_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI suggestions"
  ON idea_ai_suggestions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI suggestions"
  ON idea_ai_suggestions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();