import { safeParse, MindMapSchema } from "../../lib/aiSchemas";
import { callLLM, aiUnavailable, aiOk } from "./callLLM";
import { getSystemPromptForCurrentUser } from "./userContext";
import type { AIResult } from "./callLLM";
import { logger } from "../../utils/logger";

export interface MindMapResult {
  mermaidSyntax: string;
  title: string;
}

export async function generateMindMap(
  problemStatement: string,
  context?: string,
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<AIResult<MindMapResult>> {
  const contextPrompt = context
    ? `\n\nPrevious Context (from earlier mind maps in this exploration):
${context}

Use this context to ensure continuity and build upon previous insights. The new mind map should expand on the selected topic while maintaining awareness of the broader exploration context.`
    : "";

  const prompt = `Analyze this problem or challenge and create a mind map to break it down into manageable components. Return your response in JSON format with the following structure:
{
  "title": "Brief title for this mind map",
  "mermaidSyntax": "Valid Mermaid mindmap syntax"
}

Problem/Challenge:
${problemStatement}${contextPrompt}

Create a mind map using Mermaid syntax that:
1. Starts with the main problem/challenge as the root node
2. Breaks down into 3-5 major categories or aspects
3. Each category has 2-4 sub-items with specific actionable elements
4. Uses clear, concise labels (3-6 words max per node)
5. Organizes logically from general to specific
${context ? "6. Builds upon and expands the context provided from previous explorations" : ""}

Use this Mermaid mindmap format:
mindmap
  root((Main Problem))
    Category 1
      Subcategory A
      Subcategory B
    Category 2
      Subcategory C
      Subcategory D

Return ONLY the JSON object with title and mermaidSyntax fields, no additional text.`;

  const systemPrompt = await getSystemPromptForCurrentUser();

  const textResponse = await callLLM(
    prompt,
    0.7,
    2048,
    0.95,
    "default",
    language,
    signal,
    "generateMindMap",
    { problemStatement, context },
    systemPrompt,
  );

  if (!textResponse) {
    if (import.meta.env.DEV)
      return aiOk(generateMockMindMap(problemStatement, context, language));
    return aiUnavailable;
  }

  try {
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      const parsedResult = safeParse(MindMapSchema, raw, null);
      if (!parsedResult) {
        if (import.meta.env.DEV)
          return aiOk(generateMockMindMap(problemStatement, context, language));
        return aiUnavailable;
      }
      const defaultTitles: Record<"en" | "es" | "zh", string> = {
        en: "Mind Map",
        es: "Mapa Mental",
        zh: "思维导图",
      };
      return aiOk({
        title: parsedResult.title || defaultTitles[language],
        mermaidSyntax: parsedResult.mermaidSyntax || "",
      });
    }

    if (import.meta.env.DEV)
      return aiOk(generateMockMindMap(problemStatement, context, language));
    return aiUnavailable;
  } catch (error) {
    logger.error("Error generating mind map:", error);
    if (import.meta.env.DEV)
      return aiOk(generateMockMindMap(problemStatement, context, language));
    return aiUnavailable;
  }
}

function generateMockMindMap(
  problemStatement: string,
  _context?: string,
  language: "en" | "es" | "zh" = "en",
): MindMapResult {
  const shortProblem =
    problemStatement.slice(0, 30) + (problemStatement.length > 30 ? "..." : "");
  const titles: Record<"en" | "es" | "zh", string> = {
    en: "Problem Breakdown",
    es: "Desglose del Problema",
    zh: "问题分解",
  };

  return {
    title: titles[language],
    mermaidSyntax: `mindmap
  root((${shortProblem}))
    Understanding
      Define the problem
      Identify constraints
      Research context
    Planning
      Set clear goals
      Break into steps
      Allocate resources
    Execution
      Start with quick wins
      Track progress
      Adjust as needed
    Review
      Measure results
      Learn from experience
      Document insights`,
  };
}
