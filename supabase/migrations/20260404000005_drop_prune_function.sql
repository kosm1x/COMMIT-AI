-- Task pruning is now delegated to Jarvis
DROP FUNCTION IF EXISTS prune_completed_tasks(INTERVAL);

-- Remove the cron job if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('prune-completed-tasks');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- job may not exist
END $$;
