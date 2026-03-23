-- v2.26 Session 1: Unified Data Layer
-- Provenance tracking (modified_by) + Agent Suggestions table
-- Part of COMMIT + Jarvis unification

-- 1A. Provenance — track who changed what (user, jarvis, system)
ALTER TABLE visions ADD COLUMN IF NOT EXISTS modified_by TEXT DEFAULT 'user';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS modified_by TEXT DEFAULT 'user';
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS modified_by TEXT DEFAULT 'user';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS modified_by TEXT DEFAULT 'user';
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS modified_by TEXT DEFAULT 'user';

-- 1B. Agent Suggestions — Jarvis proposes, user disposes
CREATE TABLE IF NOT EXISTS agent_suggestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,       -- 'create_task', 'update_status', 'create_goal', 'complete_objective', 'reorder', 'archive'
  target_table TEXT,               -- 'tasks', 'goals', 'objectives', 'visions' (null for creates)
  target_id   UUID,                -- existing item to modify (null for creates)
  title       TEXT NOT NULL,       -- human-readable summary ("Crear tarea: Revisar GA4")
  suggestion  JSONB NOT NULL,      -- full payload (what to create/update)
  reasoning   TEXT,                -- why Jarvis suggests this
  source      TEXT,                -- 'proactive_scan', 'journal_analysis', 'conversation', 'weekly_review', 'event_reactor'
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- RLS: user can only see their own suggestions
ALTER TABLE agent_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suggestions"
  ON agent_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions"
  ON agent_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert (Jarvis creates suggestions)
CREATE POLICY "Service role can insert suggestions"
  ON agent_suggestions FOR INSERT
  WITH CHECK (true);

-- Index for pending suggestions query
CREATE INDEX IF NOT EXISTS idx_agent_suggestions_user_status
  ON agent_suggestions (user_id, status)
  WHERE status = 'pending';
