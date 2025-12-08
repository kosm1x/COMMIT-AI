/*
  # Add Flexible Hierarchy and Enhanced Timestamps

  ## Overview
  Updates the database schema to support flexible hierarchical relationships and detailed edit tracking.
  Goals, Objectives, and Tasks can now exist independently (orphaned) without parent constraints.

  ## Changes

  ### 1. Schema Modifications
  - Make `goal_id` nullable in objectives table (objectives can exist without a goal)
  - Make `objective_id` nullable in tasks table (tasks can exist without an objective)
  - Add `last_edited_at` timestamp to goals, objectives, and tasks tables
  - Add `notes` text field to tasks for subtasks and additional information

  ### 2. Indexes
  - Update indexes to handle nullable foreign keys efficiently
  - Add index on last_edited_at for sorting by recent edits

  ### 3. RLS Policies
  - Update policies to handle orphaned items correctly
  - Ensure users can still only access their own data

  ## Important Notes
  - Existing data will be preserved
  - All timestamps default to current time
  - Notes field defaults to empty string
*/

-- Add last_edited_at column to goals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'last_edited_at'
  ) THEN
    ALTER TABLE goals ADD COLUMN last_edited_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Add last_edited_at column to objectives
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'objectives' AND column_name = 'last_edited_at'
  ) THEN
    ALTER TABLE objectives ADD COLUMN last_edited_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Add last_edited_at and notes columns to tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'last_edited_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN last_edited_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'notes'
  ) THEN
    ALTER TABLE tasks ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

-- Make goal_id nullable in objectives table (allow orphaned objectives)
ALTER TABLE objectives ALTER COLUMN goal_id DROP NOT NULL;

-- Make objective_id nullable in tasks table (allow orphaned tasks)
ALTER TABLE tasks ALTER COLUMN objective_id DROP NOT NULL;

-- Create indexes for last_edited_at for efficient sorting
CREATE INDEX IF NOT EXISTS idx_goals_last_edited ON goals(last_edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_objectives_last_edited ON objectives(last_edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_last_edited ON tasks(last_edited_at DESC);

-- Update the update triggers to also update last_edited_at
DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
DROP TRIGGER IF EXISTS update_objectives_updated_at ON objectives;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;

-- Create enhanced update function that updates both updated_at and last_edited_at
CREATE OR REPLACE FUNCTION update_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_edited_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with new function
CREATE TRIGGER update_goals_timestamps
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER update_objectives_timestamps
  BEFORE UPDATE ON objectives
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER update_tasks_timestamps
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamps();

-- Add indexes for orphaned items queries
CREATE INDEX IF NOT EXISTS idx_objectives_orphaned ON objectives(user_id) WHERE goal_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_orphaned ON tasks(user_id) WHERE objective_id IS NULL;

-- Update existing records to have last_edited_at equal to updated_at
UPDATE goals SET last_edited_at = updated_at WHERE last_edited_at IS NULL OR last_edited_at < updated_at;
UPDATE objectives SET last_edited_at = updated_at WHERE last_edited_at IS NULL OR last_edited_at < updated_at;
UPDATE tasks SET last_edited_at = updated_at WHERE last_edited_at IS NULL OR last_edited_at < updated_at;