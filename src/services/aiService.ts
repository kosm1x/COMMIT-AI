// Barrel re-export — all consumers continue importing from this path
export { callLLM, aiUnavailable, aiOk } from "./ai/callLLM";
export type { EmotionResult, AnalysisResult, AIResult } from "./ai/callLLM";
export type { MindMapResult } from "./ai/mindmap";
export type { IdeaCompletionResult } from "./ai/ideas";
export type { DivergentPath, NextStep } from "./ai/strategic";
export type { CriticalAnalysis, RelatedConcept } from "./ai/analysis";

export {
  analyzeJournalEntry,
  extractObjectivesFromJournal,
} from "./ai/journal";

export { generateMindMap } from "./ai/mindmap";

export {
  completeIdea,
  findIdeaConnections,
  transformIdeaText,
} from "./ai/ideas";

export { generateDivergentPaths, suggestNextSteps } from "./ai/strategic";

export {
  generateCriticalAnalysis,
  generateRelatedConcepts,
} from "./ai/analysis";

export {
  suggestObjectivesForGoal,
  suggestTasksForObjective,
} from "./ai/objectives";
export type { SuggestedObjective, SuggestedTask } from "./ai/objectives";
