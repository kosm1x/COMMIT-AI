/*
  # Add Recurring Tasks Support

  ## Overview
  Adds support for recurring tasks that can be completed multiple times (e.g., daily habits).
  Recurring tasks can be marked as "completed today" without permanently changing their status.

  ## Changes

  ### 1. Schema Modifications
  - Add `is_recurring` boolean field to tasks table (default false)
  - Create `task_completions` table to track daily completions for recurring tasks

  ### 2. task_completions Table
  - `id` (uuid, primary key)
  - `task_id` (uuid, references tasks, CASCADE DELETE)
  - `user_id` (uuid, references auth.users, CASCADE DELETE)
  - `completion_date` (date) - The date the task was completed
  - `created_at` (timestamptz) - Timestamp when the completion was recorded
  - Unique constraint on (task_id, completion_date) to prevent duplicate completions

  ### 3. Indexes
  - Index on task_id for efficient queries
  - Index on user_id and completion_date for tracking queries
  - Index on (task_id, completion_date) for the unique constraint

  ### 4. RLS Policies
  - Enable RLS on task_completions table
  - Users can only access their own task completions
*/

-- Add is_recurring column to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'is_recurring'
  ) THEN
    ALTER TABLE tasks ADD COLUMN is_recurring boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create task_completions table
CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completion_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(task_id, completion_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_completion_date ON task_completions(completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date ON task_completions(user_id, completion_date DESC);

-- Enable RLS
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own task completions"
  ON task_completions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task completions"
  ON task_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own task completions"
  ON task_completions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);



