/*
  # Add Primary Emotion to Journal Entries

  1. Changes
    - Add primary_emotion column to journal_entries table
    - This will store the most important emotion identified from AI analysis
    
  2. Notes
    - Column is nullable to support entries created before this feature
    - Will be populated when AI analysis is performed
*/

-- Add primary_emotion column to journal_entries
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS primary_emotion text;
