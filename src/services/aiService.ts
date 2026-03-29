// Barrel re-export — all consumers continue importing from this path
export { callLLM } from "./ai/callLLM";
export type { EmotionResult, AnalysisResult } from "./ai/callLLM";

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
