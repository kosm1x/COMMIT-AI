-- Unique index for upsert on idea connections
CREATE UNIQUE INDEX IF NOT EXISTS idx_idea_connections_pair
  ON idea_connections (idea_id, connected_idea_id);
