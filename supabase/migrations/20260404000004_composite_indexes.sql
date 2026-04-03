-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_status_due
  ON tasks(status, due_date) WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_objectives_goal_status
  ON objectives(goal_id, status);

CREATE INDEX IF NOT EXISTS idx_suggestions_user_resolved
  ON agent_suggestions(user_id, resolved_at DESC);

-- Unique constraint for task completion upsert (prevents race condition duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_completions_unique
  ON task_completions(task_id, completion_date);
