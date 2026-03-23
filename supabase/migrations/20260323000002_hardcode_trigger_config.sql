-- Rewrite notify_jarvis() with hardcoded Supabase URL and service role key
-- (ALTER DATABASE SET is not permitted on Supabase hosted)
CREATE OR REPLACE FUNCTION notify_jarvis()
RETURNS trigger AS $$
DECLARE
  _record JSONB;
  _old_record JSONB;
  _event_type TEXT;
  _modified_by TEXT;
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
