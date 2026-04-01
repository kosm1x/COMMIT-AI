-- 7-day time-gated onboarding state
-- onboarding_day: 0 = welcome shown, 1-7 = completed day, NULL = never started
-- onboarding_started_at: set on first login (day 0 completion)
-- onboarding_completed_at: set when day 7 completes or user dismisses
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS onboarding_day integer DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS onboarding_started_at timestamptz;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
