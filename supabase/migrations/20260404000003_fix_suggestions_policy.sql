-- Fix agent_suggestions UPDATE policy — add WITH CHECK to prevent user_id mutation
DROP POLICY IF EXISTS "Users can update own suggestions" ON agent_suggestions;
CREATE POLICY "Users can update own suggestions"
  ON agent_suggestions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
