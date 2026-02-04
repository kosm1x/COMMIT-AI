-- Daily Planner Feature Migration
-- Adds tables for daily planning with time slots

-- Daily plans table (one per user per date)
CREATE TABLE IF NOT EXISTS daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_date date NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, plan_date)
);

-- Junction table linking tasks to daily plans with time slots
CREATE TABLE IF NOT EXISTS daily_plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_plan_id uuid REFERENCES daily_plans(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  time_slot text NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'night')),
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans(user_id, plan_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_plan_tasks_plan ON daily_plan_tasks(daily_plan_id);
CREATE INDEX IF NOT EXISTS idx_daily_plan_tasks_task ON daily_plan_tasks(task_id);

-- Enable Row Level Security
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plan_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_plans
CREATE POLICY "Users can view own daily plans"
  ON daily_plans FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own daily plans"
  ON daily_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily plans"
  ON daily_plans FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily plans"
  ON daily_plans FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for daily_plan_tasks
CREATE POLICY "Users can view own daily plan tasks"
  ON daily_plan_tasks FOR SELECT
  USING (daily_plan_id IN (SELECT id FROM daily_plans WHERE user_id = auth.uid()));

CREATE POLICY "Users can create own daily plan tasks"
  ON daily_plan_tasks FOR INSERT
  WITH CHECK (daily_plan_id IN (SELECT id FROM daily_plans WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own daily plan tasks"
  ON daily_plan_tasks FOR UPDATE
  USING (daily_plan_id IN (SELECT id FROM daily_plans WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own daily plan tasks"
  ON daily_plan_tasks FOR DELETE
  USING (daily_plan_id IN (SELECT id FROM daily_plans WHERE user_id = auth.uid()));
