/*
  # Add Unique Constraint to AI Analysis

  1. Changes
    - Add unique constraint on entry_id in ai_analysis table
    - Clean up any duplicate records before adding constraint
    
  2. Security
    - No changes to RLS policies
*/

-- First, delete duplicate analysis records, keeping only the most recent one per entry
DELETE FROM ai_analysis a
WHERE id NOT IN (
  SELECT DISTINCT ON (entry_id) id
  FROM ai_analysis
  ORDER BY entry_id, analyzed_at DESC
);

-- Add unique constraint on entry_id
ALTER TABLE ai_analysis 
ADD CONSTRAINT ai_analysis_entry_id_unique UNIQUE (entry_id);
