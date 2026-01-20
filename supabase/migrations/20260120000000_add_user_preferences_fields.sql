/*
  # Add User Preferences Fields
  
  1. Changes
    - Add `language` column to store user's preferred language (en, es, zh)
    - Add `last_page_visited` column to remember the last page user was on
    - Add `theme` column to replace dark_mode boolean with flexible theme option
    
  2. Migration Strategy
    - Add new columns
    - Migrate existing dark_mode values to theme
    - Keep dark_mode for backwards compatibility (will deprecate later)
*/

-- Add new columns to user_preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en' CHECK (language IN ('en', 'es', 'zh')),
ADD COLUMN IF NOT EXISTS last_page_visited text DEFAULT '/journal',
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'dark' CHECK (theme IN ('light', 'dark'));

-- Migrate existing dark_mode values to theme
UPDATE user_preferences
SET theme = CASE
  WHEN dark_mode = true THEN 'dark'
  ELSE 'light'
END
WHERE theme IS NULL OR theme = 'dark';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
