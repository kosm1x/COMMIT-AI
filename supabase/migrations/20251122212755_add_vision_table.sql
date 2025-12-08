/*
  # Add Vision Table to Hierarchy

  ## Overview
  Creates a new 'visions' table at the top of the hierarchy, above goals.
  The hierarchy becomes: Vision > Goals > Objectives > Tasks

  ## New Tables

  ### visions
  Top-level visions in the hierarchy
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `title` (text) - The vision title
  - `description` (text) - Detailed description of the vision
  - `status` (text) - not_started, in_progress, completed, on_hold
  - `target_date` (date) - Optional target completion date
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `last_edited_at` (timestamptz)

  ## Changes

  ### 1. Create visions table
  - Add new table with same structure as goals
  - Include status, target_date, and timestamp fields
  - Add last_edited_at for consistency with other tables

  ### 2. Update goals table
  - Add `vision_id` column (nullable) to link goals to visions
  - Goals can exist without a vision (orphaned)
  - Foreign key with CASCADE delete

  ### 3. Indexes
  - Add indexes for user queries and vision relationships
  - Add index for orphaned visions

  ### 4. Security (RLS)
  - Enable RLS on visions table
  - Users can only access their own visions
  - Policies for SELECT, INSERT, UPDATE, DELETE

  ## Important Notes
  - Existing goals remain unchanged (vision_id will be NULL)
  - Vision is optional - goals can exist independently
  - All timestamp tracking is consistent across hierarchy
*/

-- Create visions table
CREATE TABLE IF NOT EXISTS visions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold')),
  target_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  last_edited_at timestamptz DEFAULT now() NOT NULL
);

-- Add vision_id to goals table (nullable to allow orphaned goals)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'vision_id'
  ) THEN
    ALTER TABLE goals ADD COLUMN vision_id uuid REFERENCES visions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_visions_user_id ON visions(user_id);
CREATE INDEX IF NOT EXISTS idx_visions_status ON visions(status);
CREATE INDEX IF NOT EXISTS idx_visions_last_edited ON visions(last_edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_vision_id ON goals(vision_id);
CREATE INDEX IF NOT EXISTS idx_goals_orphaned ON goals(user_id) WHERE vision_id IS NULL;

-- Enable Row Level Security on visions
ALTER TABLE visions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for visions
CREATE POLICY "Users can view own visions"
  ON visions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visions"
  ON visions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own visions"
  ON visions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own visions"
  ON visions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at and last_edited_at on visions
CREATE TRIGGER update_visions_timestamps
  BEFORE UPDATE ON visions
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamps();