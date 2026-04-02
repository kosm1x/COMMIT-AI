-- Notification preference columns on user_preferences
ALTER TABLE user_preferences
  ADD COLUMN notify_journal_reminder boolean DEFAULT true,
  ADD COLUMN notify_streak_alert boolean DEFAULT true,
  ADD COLUMN notify_task_due boolean DEFAULT true,
  ADD COLUMN notify_weekly_digest boolean DEFAULT true,
  ADD COLUMN reminder_hour integer DEFAULT 20,
  ADD COLUMN timezone text;
