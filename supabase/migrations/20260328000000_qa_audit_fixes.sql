-- v2.26 QA Audit Fixes
-- F4:  Restrict agent_suggestions INSERT to service_role only
-- F7:  Add CHECK constraints on modified_by columns
-- F16: Add DELETE policy on agent_suggestions
-- F17: Remove dead DELETE branch from notify_jarvis()

-- F4. Fix overly permissive INSERT policy on agent_suggestions
-- Old policy used WITH CHECK (true), allowing any authenticated user to insert
-- for any user_id. Now restricted to service_role (Jarvis).
DROP POLICY IF EXISTS "Service role can insert suggestions" ON agent_suggestions;
CREATE POLICY "Service role can insert suggestions"
  ON agent_suggestions FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- F7. Add CHECK constraints on modified_by — only allow known actors
ALTER TABLE visions
  ADD CONSTRAINT chk_visions_modified_by CHECK (modified_by IN ('user', 'jarvis', 'system'));

ALTER TABLE goals
  ADD CONSTRAINT chk_goals_modified_by CHECK (modified_by IN ('user', 'jarvis', 'system'));

ALTER TABLE objectives
  ADD CONSTRAINT chk_objectives_modified_by CHECK (modified_by IN ('user', 'jarvis', 'system'));

ALTER TABLE tasks
  ADD CONSTRAINT chk_tasks_modified_by CHECK (modified_by IN ('user', 'jarvis', 'system'));

ALTER TABLE journal_entries
  ADD CONSTRAINT chk_journal_entries_modified_by CHECK (modified_by IN ('user', 'jarvis', 'system'));

-- F16. Add missing DELETE policy on agent_suggestions
CREATE POLICY "Users can delete own suggestions"
  ON agent_suggestions FOR DELETE
  USING (auth.uid() = user_id);

-- F17. Replace notify_jarvis() removing dead DELETE branch
-- No trigger fires on DELETE, so the DELETE handling was unreachable dead code.
-- Also adds a comment about the hardcoded service role key (F2).
CREATE OR REPLACE FUNCTION notify_jarvis()
RETURNS trigger AS $$
DECLARE
  _record JSONB;
  _old_record JSONB;
  _event_type TEXT;
  _modified_by TEXT;
BEGIN
  -- NOTE: The Authorization header below contains a hardcoded service role key.
  -- This is required because ALTER DATABASE SET is not permitted on Supabase hosted.
  -- The key should be rotated periodically via the Supabase dashboard.
  -- See: supabase/migrations/20260323000002_hardcode_trigger_config.sql

  IF TG_OP = 'INSERT' THEN
    _event_type := 'INSERT';
    _record := to_jsonb(NEW);
    _old_record := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    _event_type := 'UPDATE';
    _record := to_jsonb(NEW);
    _old_record := to_jsonb(OLD);
  END IF;

  _modified_by := COALESCE(
    CASE WHEN _record IS NOT NULL THEN _record->>'modified_by' ELSE NULL END,
    'user'
  );
  IF _modified_by = 'jarvis' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM net.http_post(
    url := 'https://eqwdmscuwgnftosqrcdy.supabase.co/functions/v1/commit-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2Rtc2N1d2duZnRvc3FyY2R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTEzNzAwMywiZXhwIjoyMDgwNzEzMDAzfQ.ONhbpOGieacGD8dXTsuD7BFhXktadYZ1oyaZoSoKa1U'
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
    RAISE WARNING 'notify_jarvis failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
