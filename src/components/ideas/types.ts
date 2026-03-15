export interface Idea {
  id: string;
  user_id: string;
  title: string;
  content: string;
  initial_input: string;
  category: string;
  tags: string[];
  status: "draft" | "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export interface Connection {
  ideaId: string;
  ideaTitle: string;
  connectionType: "similar" | "complementary" | "prerequisite" | "related";
  strength: number;
  reason: string;
}
