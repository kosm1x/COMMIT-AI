-- Phase 6: Composite indexes for common query patterns
-- Optimizes: user-scoped status filtering, date-based task queries

CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks (user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals (user_id, status);
CREATE INDEX IF NOT EXISTS idx_objectives_user_status ON objectives (user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks (user_id, due_date);
