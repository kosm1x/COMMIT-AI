-- Self-hosted: Replace hardcoded Supabase URL with database config vars.
-- ALTER DATABASE SET is available on self-hosted (forbidden on Supabase hosted).
-- This supersedes the hardcoded values in 20260323000002 and 20260328000000.

ALTER DATABASE postgres SET app.webhook_url = 'http://kong:8000/functions/v1/commit-events';
-- app.service_role_key is set separately at deploy time (not stored in migration).

-- Rewrite notify_jarvis() to read from config (dynamic, not hardcoded)
CREATE OR REPLACE FUNCTION notify_jarvis()
RETURNS trigger AS $$
DECLARE
  _record JSONB;
  _old_record JSONB;
  _event_type TEXT;
  _modified_by TEXT;
  _webhook_url TEXT;
  _service_key TEXT;
BEGIN
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

  _modified_by := COALESCE(
    CASE WHEN _record IS NOT NULL THEN _record->>'modified_by' ELSE NULL END,
    'user'
  );
  IF _modified_by = 'jarvis' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  _webhook_url := current_setting('app.webhook_url', true);
  _service_key := current_setting('app.service_role_key', true);

  IF _webhook_url IS NULL OR _webhook_url = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM net.http_post(
    url := _webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
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
