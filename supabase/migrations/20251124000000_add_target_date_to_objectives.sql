-- Add target_date field to objectives table
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS target_date date;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_objectives_target_date ON objectives(target_date);



