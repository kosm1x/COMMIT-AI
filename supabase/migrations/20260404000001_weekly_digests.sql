-- Weekly digest table for interpretive tracking insights
CREATE TABLE weekly_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}',
  insights text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own digests" ON weekly_digests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role inserts digests" ON weekly_digests
  FOR INSERT WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
  );

-- Schedule weekly digest generation: Sundays at 18:00 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'weekly-digest',
      '0 18 * * 0',
      $$SELECT net.http_post(
        url := 'http://kong:8000/functions/v1/weekly-digest',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body := '{}'::jsonb
      )$$
    );
  END IF;
END $$;
