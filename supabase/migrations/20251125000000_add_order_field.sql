-- Add order field to visions, goals, objectives, and tasks tables
-- This allows users to manually order items within each status column

-- Add order field to visions table
ALTER TABLE visions ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0;

-- Add order field to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0;

-- Add order field to objectives table
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0;

-- Add order field to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0;

-- Create indexes for better query performance when ordering
CREATE INDEX IF NOT EXISTS idx_visions_order ON visions(status, "order");
CREATE INDEX IF NOT EXISTS idx_goals_order ON goals(status, "order");
CREATE INDEX IF NOT EXISTS idx_objectives_order ON objectives(status, "order");
CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(status, "order");

-- Initialize order values based on created_at for existing records
-- This ensures existing items have a proper order
UPDATE visions SET "order" = subquery.row_number - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, status ORDER BY created_at) as row_number
  FROM visions
) AS subquery
WHERE visions.id = subquery.id;

UPDATE goals SET "order" = subquery.row_number - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, status ORDER BY created_at) as row_number
  FROM goals
) AS subquery
WHERE goals.id = subquery.id;

UPDATE objectives SET "order" = subquery.row_number - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, status ORDER BY created_at) as row_number
  FROM objectives
) AS subquery
WHERE objectives.id = subquery.id;

UPDATE tasks SET "order" = subquery.row_number - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, status ORDER BY created_at) as row_number
  FROM tasks
) AS subquery
WHERE tasks.id = subquery.id;

