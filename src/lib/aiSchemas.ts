import { z } from "zod";

// Shared refinements
const clampedIntensity = z
  .number()
  .catch(50)
  .transform((n) => Math.max(0, Math.min(100, n)));
const clampedStrength = z
  .number()
  .catch(50)
  .transform((n) => Math.max(1, Math.min(100, n)));

// 1. analyzeJournalEntry
export const AnalysisResultSchema = z
  .object({
    emotions: z
      .array(
        z.object({
          name: z.string().catch("neutral"),
          intensity: clampedIntensity,
        }),
      )
      .catch([]),
    patterns: z.array(z.string()).catch([]),
    coping_strategies: z.array(z.string()).catch([]),
    primary_emotion: z.string().catch("neutral"),
  })
  .passthrough();

// 2. extractObjectivesFromJournal
export const ObjectivesArraySchema = z.array(z.string()).catch([]);

// 3. generateMindMap
export const MindMapSchema = z
  .object({
    title: z.string().catch("Mind Map"),
    mermaidSyntax: z.string().catch(""),
  })
  .passthrough();

// 4. completeIdea
export const CompleteIdeaSchema = z
  .object({
    title: z.string().catch(""),
    expandedContent: z.string().catch(""),
    category: z.string().catch("general"),
    tags: z.array(z.string()).catch([]),
    suggestions: z.array(z.string()).catch([]),
  })
  .passthrough();

// 5. findIdeaConnections
export const IdeaConnectionSchema = z
  .object({
    ideaId: z.string(),
    connectionType: z.string().catch("related"),
    strength: clampedStrength,
    reason: z.string().catch("Related concept"),
  })
  .passthrough();
export const IdeaConnectionsArraySchema = z.array(IdeaConnectionSchema);

// 6. generateDivergentPaths
export const DivergentPathSchema = z
  .object({
    title: z.string().catch(""),
    description: z.string().catch(""),
    approach: z.string().catch(""),
    potentialOutcome: z.string().catch(""),
  })
  .passthrough();
export const DivergentPathsArraySchema = z.array(DivergentPathSchema);

// 7. suggestNextSteps
export const NextStepSchema = z
  .object({
    step: z.string().catch(""),
    description: z.string().catch(""),
    timeEstimate: z.string().catch(""),
    priority: z.string().catch("medium"),
  })
  .passthrough();
export const NextStepsArraySchema = z.array(NextStepSchema);

// 8. generateCriticalAnalysis
export const CriticalAnalysisSchema = z
  .object({
    strengths: z.array(z.string()).catch([]),
    challenges: z.array(z.string()).catch([]),
    assumptions: z.array(z.string()).catch([]),
    alternativePerspectives: z.array(z.string()).catch([]),
  })
  .passthrough();

// 9. generateRelatedConcepts
export const RelatedConceptSchema = z
  .object({
    concept: z.string().catch(""),
    description: z.string().catch(""),
    relevance: z.string().catch(""),
    resources: z.array(z.string()).catch([]),
  })
  .passthrough();
export const RelatedConceptsArraySchema = z.array(RelatedConceptSchema);

// 10. suggestObjectivesForGoal
export const SuggestedObjectiveSchema = z
  .object({
    title: z.string().catch(""),
    description: z.string().catch(""),
    priority: z.string().catch("medium"),
    reasoning: z.string().catch(""),
  })
  .passthrough();
export const SuggestedObjectivesArraySchema = z.array(SuggestedObjectiveSchema);

// 12. suggestTasksForObjective (same shape as objectives)
export const SuggestedTaskSchema = z
  .object({
    title: z.string().catch(""),
    description: z.string().catch(""),
    priority: z.string().catch("medium"),
    reasoning: z.string().catch(""),
  })
  .passthrough();
export const SuggestedTasksArraySchema = z.array(SuggestedTaskSchema);

/**
 * Safe parse with fallback. Returns validated data or fallback on failure.
 * Logs validation warnings in development for debugging.
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  fallback: T,
): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  if (import.meta.env.DEV) {
    console.warn(
      "[AI Schema] Validation failed, using fallback:",
      result.error.issues,
    );
  }
  return fallback;
}
