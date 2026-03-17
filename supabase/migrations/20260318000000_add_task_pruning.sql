-- Partial index for efficient pruning (only completed, non-recurring tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_prune_candidates
  ON tasks(completed_at)
  WHERE status = 'completed' AND is_recurring = false;

-- Pruning function: auth.uid() scopes to calling user; pg_cron (no auth) prunes all
CREATE OR REPLACE FUNCTION prune_completed_tasks(
  retention_interval INTERVAL DEFAULT INTERVAL '15 days'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
  calling_user UUID;
BEGIN
  calling_user := auth.uid();

  IF calling_user IS NOT NULL THEN
    DELETE FROM tasks
    WHERE status = 'completed'
      AND is_recurring = false
      AND completed_at IS NOT NULL
      AND completed_at < now() - retention_interval
      AND user_id = calling_user;
  ELSE
    DELETE FROM tasks
    WHERE status = 'completed'
      AND is_recurring = false
      AND completed_at IS NOT NULL
      AND completed_at < now() - retention_interval;
  END IF;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Schedule daily at 03:00 UTC (only if pg_cron extension available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'prune-completed-tasks',
      '0 3 * * *',
      $$SELECT prune_completed_tasks()$$
    );
  END IF;
END $$;
