-- Add document_links column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS document_links jsonb DEFAULT '[]'::jsonb;

-- Add index for better query performance on document links
CREATE INDEX IF NOT EXISTS idx_tasks_document_links ON tasks USING gin(document_links);

-- Update RLS policies are already in place, no changes needed
