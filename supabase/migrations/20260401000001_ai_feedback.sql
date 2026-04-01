-- Add AI feedback tracking column to user_preferences
-- Stores accept/reject counts per AI function type as JSONB
-- Schema: { "accepted_types": { "next_steps": 12, ... }, "rejected_types": { "divergent_paths": 5, ... } }
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS ai_feedback jsonb DEFAULT '{}';
