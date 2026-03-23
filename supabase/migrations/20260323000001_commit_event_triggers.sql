-- v2.26 Session 1C: Database triggers for COMMIT → Jarvis event flow
-- Uses pg_net extension to POST to the commit-events Edge Function
-- on INSERT/UPDATE to key tables.
--
-- NOTE: pg_net must be enabled in the Supabase dashboard (Extensions section).
-- The trigger function constructs the webhook payload and fires asynchronously.
-- If Jarvis is down, the trigger still succeeds (fire-and-forget).

-- Enable pg_net extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Generic trigger function that forwards row changes to the commit-events Edge Function
CREATE OR REPLACE FUNCTION notify_jarvis()
RETURNS trigger AS $$
DECLARE
  _record JSONB;
  _old_record JSONB;
  _event_type TEXT;
  _modified_by TEXT;
  _supabase_url TEXT;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    _event_type := 'INSERT';
    _record := to_jsonb(NEW);
    _old_record := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    _event_type := 'UPDATE';
    _record := to_jsonb(NEW);
    _old_record := to_jsonb(OLD);
  ELSIF TG_OP = 'DELETE' THEN
    _event_type := 'DELETE';
    _record := NULL;
    _old_record := to_jsonb(OLD);
  END IF;

  -- Check modified_by to prevent echo loops (skip jarvis-originated changes)
  _modified_by := COALESCE(
    CASE WHEN _record IS NOT NULL THEN _record->>'modified_by' ELSE NULL END,
    'user'
  );
  IF _modified_by = 'jarvis' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get Supabase URL from config (set via Supabase dashboard)
  _supabase_url := current_setting('app.settings.supabase_url', true);
  IF _supabase_url IS NULL OR _supabase_url = '' THEN
    -- Fallback: skip silently if URL not configured
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Fire async HTTP POST via pg_net
  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/commit-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', _event_type,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', _record,
      'old_record', _old_record
    )
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Never let webhook failures block the original operation
    RAISE WARNING 'notify_jarvis failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to key tables
-- Tasks: track completions, status changes, new task creation
DROP TRIGGER IF EXISTS trg_tasks_notify_jarvis ON tasks;
CREATE TRIGGER trg_tasks_notify_jarvis
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_jarvis();

-- Goals: track status changes
DROP TRIGGER IF EXISTS trg_goals_notify_jarvis ON goals;
CREATE TRIGGER trg_goals_notify_jarvis
  AFTER INSERT OR UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION notify_jarvis();

-- Objectives: track completion, status changes
DROP TRIGGER IF EXISTS trg_objectives_notify_jarvis ON objectives;
CREATE TRIGGER trg_objectives_notify_jarvis
  AFTER INSERT OR UPDATE ON objectives
  FOR EACH ROW EXECUTE FUNCTION notify_jarvis();

-- Journal entries: trigger deep analysis
DROP TRIGGER IF EXISTS trg_journal_notify_jarvis ON journal_entries;
CREATE TRIGGER trg_journal_notify_jarvis
  AFTER INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION notify_jarvis();
