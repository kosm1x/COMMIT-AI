import {
  safeParse,
  CompleteIdeaSchema,
  IdeaConnectionsArraySchema,
} from "../../lib/aiSchemas";
import { callLLM } from "./callLLM";
import { findSimilarIdeasFallback } from "./textAnalysis";
import type { IdeaConnection } from "./textAnalysis";
import { logger } from '../../utils/logger';

interface IdeaCompletionResult {
  title: string;
  expandedContent: string;
  category: string;
  tags: string[];
  suggestions: string[];
}

export async function completeIdea(
  initialInput: string,
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<IdeaCompletionResult> {
  const prompt = `You are a creative assistant helping expand on a minimal idea. Take this initial idea input and help complete it. Return your response in JSON format with the following structure:
{
  "title": "A clear, concise title for this idea (5-8 words)",
  "expandedContent": "A detailed expansion of the idea (2-3 paragraphs explaining the concept, potential approaches, and considerations)",
  "category": "A single category label (e.g., 'technology', 'business', 'creative', 'personal', 'health', 'education')",
  "tags": ["tag1", "tag2", "tag3"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}

Initial Idea:
${initialInput}

Instructions:
1. Create a clear, descriptive title
2. Expand the idea with concrete details, examples, and potential implementations
3. Assign the most appropriate category
4. Generate 3-5 relevant tags
5. Provide 3-5 actionable next steps or suggestions to develop this idea further

Return ONLY the JSON object, no additional text.`;

  const textResponse = await callLLM(
    prompt,
    0.8,
    2048,
    0.95,
    undefined,
    language,
    signal,
    "completeIdea",
    { initialInput },
  );

  if (!textResponse) {
    return generateMockIdeaCompletion(initialInput, language);
  }

  try {
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      const parsedResult = safeParse(CompleteIdeaSchema, raw, null);
      if (!parsedResult)
        return generateMockIdeaCompletion(initialInput, language);
      const defaultTitles: Record<"en" | "es" | "zh", string> = {
        en: "New Idea",
        es: "Nueva Idea",
        zh: "新想法",
      };
      return {
        title: parsedResult.title || defaultTitles[language],
        expandedContent: parsedResult.expandedContent || initialInput,
        category: parsedResult.category || "general",
        tags: parsedResult.tags || [],
        suggestions: parsedResult.suggestions || [],
      };
    }

    return generateMockIdeaCompletion(initialInput, language);
  } catch (error) {
    logger.error("Error completing idea:", error);
    return generateMockIdeaCompletion(initialInput, language);
  }
}

function generateMockIdeaCompletion(
  initialInput: string,
  language: "en" | "es" | "zh" = "en",
): IdeaCompletionResult {
  const mockData: Record<
    "en" | "es" | "zh",
    {
      expandedContent: string;
      suggestions: string[];
    }
  > = {
    en: {
      expandedContent: `${initialInput}\n\nThis is a promising concept that could be developed further. Consider breaking it down into smaller, actionable steps. Think about the resources you'll need, potential challenges, and how you can measure success.\n\nTo move forward, start by researching similar approaches and identifying key stakeholders or collaborators who could help bring this idea to life.`,
      suggestions: [
        "Research existing solutions in this area",
        "Create a detailed action plan with milestones",
        "Identify potential collaborators or resources",
        "Start with a small prototype or proof of concept",
      ],
    },
    es: {
      expandedContent: `${initialInput}\n\nEste es un concepto prometedor que podría desarrollarse más. Considera dividirlo en pasos más pequeños y accionables. Piensa en los recursos que necesitarás, los desafíos potenciales y cómo puedes medir el éxito.\n\nPara avanzar, comienza investigando enfoques similares e identificando partes interesadas clave o colaboradores que podrían ayudar a dar vida a esta idea.`,
      suggestions: [
        "Investiga soluciones existentes en esta área",
        "Crea un plan de acción detallado con hitos",
        "Identifica colaboradores o recursos potenciales",
        "Comienza con un prototipo pequeño o prueba de concepto",
      ],
    },
    zh: {
      expandedContent: `${initialInput}\n\n这是一个有前景的概念，可以进一步发展。考虑将其分解为更小、可操作的步骤。思考您需要的资源、潜在挑战以及如何衡量成功。\n\n要向前推进，首先研究类似的方法，并确定可以帮助实现这个想法的关键利益相关者或合作者。`,
      suggestions: [
        "研究该领域的现有解决方案",
        "创建带有里程碑的详细行动计划",
        "确定潜在的合作者或资源",
        "从一个小原型或概念验证开始",
      ],
    },
  };

  const data = mockData[language];
  return {
    title: initialInput.slice(0, 50) + (initialInput.length > 50 ? "..." : ""),
    expandedContent: data.expandedContent,
    category: "general",
    tags: ["brainstorming", "new-idea", "development"],
    suggestions: data.suggestions,
  };
}

export async function findIdeaConnections(
  currentIdea: string,
  existingIdeas: {
    id: string;
    title: string;
    content: string;
    tags?: string[];
  }[],
  currentIdeaMeta?: { title: string; tags?: string[] },
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<IdeaConnection[]> {
  if (existingIdeas.length === 0) {
    logger.info("[findIdeaConnections] No existing ideas to compare");
    return [];
  }

  logger.info(
    `[findIdeaConnections] Analyzing connections for idea with ${existingIdeas.length} existing ideas`,
  );

  // Extract current idea title and content for better matching
  const currentLines = currentIdea.split("\n");
  const currentTitle = currentLines[0] || "";
  const currentContent = currentIdea.slice(currentTitle.length).trim();

  const ideasContext = existingIdeas
    .map((idea, idx) => {
      const tagsStr =
        idea.tags && idea.tags.length > 0
          ? `\nTags: ${idea.tags.join(", ")}`
          : "";
      return `${idx + 1}. [ID: ${idea.id}] ${idea.title}${tagsStr}\n${(idea.content || "").slice(0, 300)}`;
    })
    .join("\n\n");

  const prompt = `Analyze this idea and find CLOSE connections with existing ideas. Only include ideas that are genuinely related, not loosely connected.

STRICT GUIDELINES:
- Return connections with strength score of 70 or higher (on a scale of 1-100)
- Prioritize ideas with similar or identical titles
- Then prioritize ideas that share the same tags
- Only include ideas that have a STRONG, CLEAR relationship
- Be selective - exclude loose or tangential connections
- Each connection must have a clear, specific reason

Current Idea:
${currentIdea}
${currentIdeaMeta?.tags && currentIdeaMeta.tags.length > 0 ? `Tags: ${currentIdeaMeta.tags.join(", ")}` : ""}

Existing Ideas:
${ideasContext}

For each CLOSE connection (strength >= 70), return:
{
  "ideaId": "the ID of the connected idea",
  "connectionType": "similar|complementary|prerequisite|related",
  "strength": 70-100 (must be 70 or higher),
  "reason": "clear, specific explanation of why these ideas are closely connected"
}

Connection types (use sparingly):
- similar: Ideas with very similar titles or nearly identical topics
- complementary: Ideas that directly work together or enhance each other
- prerequisite: Ideas that must logically be completed before this one
- related: Ideas that share the same tags or very specific themes

IMPORTANT:
- Title similarity is the strongest indicator - prioritize exact or near-exact title matches
- Tag overlap is the second strongest indicator - ideas sharing 2+ tags are likely related
- Be STRICT - only return connections where there's a clear, close relationship
- Return empty array [] if there are no close connections

Return ONLY a JSON array of connection objects with strength >= 70. Return empty array [] if no close connections exist.`;

  const textResponse = await callLLM(
    prompt,
    0.5,
    2048,
    0.95,
    "default",
    language,
    signal,
    "findIdeaConnections",
  );

  if (!textResponse) {
    logger.warn(
      "[findIdeaConnections] API call failed, using fallback similarity check",
    );
    return findSimilarIdeasFallback(
      currentIdea,
      currentTitle,
      currentContent,
      existingIdeas,
      undefined,
      language,
    );
  }

  logger.info(
    "[findIdeaConnections] API response received, length:",
    textResponse.length,
  );

  try {
    // Try to extract JSON array from response
    let jsonMatch = textResponse.match(/\[[\s\S]*\]/);

    // If no array found, try to find JSON objects
    if (!jsonMatch) {
      jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // If single object, wrap in array
        const singleObj = JSON.parse(jsonMatch[0]);
        if (singleObj.ideaId) {
          jsonMatch = [JSON.stringify([singleObj])];
        }
      }
    }

    if (jsonMatch) {
      const rawConnections = JSON.parse(jsonMatch[0]);

      // Ensure connections is an array
      const rawArray = Array.isArray(rawConnections)
        ? rawConnections
        : [rawConnections];

      const connections = safeParse(IdeaConnectionsArraySchema, rawArray, null);
      if (!connections) {
        return findSimilarIdeasFallback(
          currentIdea,
          currentTitle,
          currentContent,
          existingIdeas,
          currentIdeaMeta,
          language,
        );
      }

      logger.info(
        "[findIdeaConnections] Parsed connections:",
        connections.length,
      );

      const connectionsArray = connections;

      const MIN_STRENGTH_THRESHOLD = 70;

      const filteredConnections = connectionsArray
        .map((conn) => {
          const matchedIdea = existingIdeas.find(
            (idea) => idea.id === conn.ideaId,
          );
          if (!matchedIdea) {
            logger.warn(
              `[findIdeaConnections] Connection references unknown idea ID: ${conn.ideaId}`,
            );
            return null;
          }

          const strength = Math.min(100, Math.max(1, conn.strength || 50));

          return {
            ideaId: conn.ideaId,
            ideaTitle: matchedIdea.title,
            connectionType: (conn.connectionType || "related") as
              | "similar"
              | "complementary"
              | "prerequisite"
              | "related",
            strength,
            reason: conn.reason || "Related concept",
          };
        })
        .filter(
          (conn): conn is IdeaConnection =>
            conn !== null && conn.strength >= MIN_STRENGTH_THRESHOLD,
        );

      logger.info(
        `[findIdeaConnections] Filtered to ${filteredConnections.length} connections with strength >= ${MIN_STRENGTH_THRESHOLD}`,
      );

      // If no AI connections found, use strict fallback
      if (filteredConnections.length === 0) {
        logger.info(
          "[findIdeaConnections] No AI connections found, using strict fallback similarity check",
        );
        return findSimilarIdeasFallback(
          currentIdea,
          currentTitle,
          currentContent,
          existingIdeas,
          currentIdeaMeta,
          language,
        );
      }

      return filteredConnections;
    } else {
      logger.warn(
        "[findIdeaConnections] Could not extract JSON from response, using fallback",
      );
      return findSimilarIdeasFallback(
        currentIdea,
        currentTitle,
        currentContent,
        existingIdeas,
        undefined,
        language,
      );
    }
  } catch (error) {
    logger.error("[findIdeaConnections] Error parsing connections:", error);
    logger.error(
      "[findIdeaConnections] Response was:",
      textResponse.substring(0, 500),
    );
    return findSimilarIdeasFallback(
      currentIdea,
      currentTitle,
      currentContent,
      existingIdeas,
      undefined,
      language,
    );
  }
}

// Transform or collaborate on selected text within an idea
export async function transformIdeaText(
  mode: "enhance" | "complete" | "shorten" | "summarize" | "cocreate",
  selectedText: string,
  context: {
    title: string;
    content: string;
    cursorPosition?: number;
    fullContext?: string;
  },
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<string> {
  const prompts: Record<typeof mode, string> = {
    enhance: `Improve clarity, style, and impact of the following text. Keep the author's intent and voice. Return only the rewritten text, nothing else.`,

    complete: `Continue writing naturally from where the text ends. Match the tone and style. Keep it focused and purposeful. Return ONLY the continuation (do not repeat the existing text).`,

    shorten: `Condense the following text while preserving key meaning and tone. Return only the shortened version.`,

    summarize: `Create a concise summary of the entire text in 2-4 sentences, capturing the essential points. Return only the summary.`,

    cocreate: `Based on the last paragraph provided, add 1-2 thoughtful new paragraphs that naturally build on these ideas. Keep the same voice and style. Return ONLY the new content (do not repeat the existing paragraph).`,
  };

  let prompt = "";

  if (mode === "complete") {
    prompt = `${prompts[mode]}

Context - Idea Title: ${context.title}

Existing Text (continue from here):
${selectedText}

RULES:
- Start your response immediately with the continuation
- Do NOT repeat the existing text
- Continue naturally from where it ends
- No thinking tags, no explanations
- Maximum 500 tokens
- Ensure the text is complete (do not cut off mid-sentence)`;
  } else if (mode === "cocreate") {
    prompt = `${prompts[mode]}

Context - Idea Title: ${context.title}

Last Paragraph:
${selectedText}

RULES:
- Start your response immediately with new content
- Do NOT repeat the last paragraph
- Build upon it naturally
- No thinking tags, no explanations
- Maximum 500 tokens
- Ensure the text is complete`;
  } else {
    prompt = `${prompts[mode]}

Context - Idea Title: ${context.title}

Text to Transform:
${selectedText}

RULES:
- Start your response immediately with the transformed text
- No thinking tags, no explanations, no preambles
- Maximum 500 tokens for the output
- Ensure the text is complete (do not cut off mid-sentence)`;
  }

  // Use 600 tokens to ensure we get complete text even if there's some overhead
  const textResponse = await callLLM(
    prompt,
    0.5,
    600,
    0.95,
    undefined,
    language,
    signal,
    "transformIdeaText",
    { selectedText, mode },
  );
  if (!textResponse) {
    return selectedText;
  }

  // Filter out thinking/reasoning artifacts from the response
  return cleanTransformOutput(textResponse);
}

/**
 * Removes LLM thinking artifacts and extracts only the final text output
 */
function cleanTransformOutput(text: string): string {
  let cleaned = text.trim();

  // CRITICAL: Remove ALL thinking tag variants (including truncated ones)
  // Match both complete and incomplete/truncated tags
  cleaned = cleaned.replace(/<think[\s\S]*?(?:<\/think>|$)/gi, "");
  cleaned = cleaned.replace(/<thinking[\s\S]*?(?:<\/thinking>|$)/gi, "");

  // Remove any remaining opening tags that might be left
  cleaned = cleaned.replace(/<\/?think(?:ing)?>/gi, "");

  // Remove reasoning sections (common patterns)
  cleaned = cleaned.replace(
    /^\s*(?:Thinking|Reasoning|Analysis|Approach|Strategy|Plan):\s*[\s\S]*?(?=\n\n|$)/im,
    "",
  );

  // Remove "Here's the..." or "Here is the..." prefixes
  cleaned = cleaned.replace(
    /^(?:Here's|Here is|This is) (?:the|a) [\w\s]+:?\s*/i,
    "",
  );

  // Remove quoted output (if the entire result is wrapped in quotes)
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  // Remove code fences if the entire output is wrapped
  cleaned = cleaned.replace(/^```[\w]*\s*([\s\S]*?)\s*```$/g, "$1");

  // Remove "Output:" or "Result:" prefixes
  cleaned = cleaned.replace(
    /^(?:Output|Result|Final (?:output|result|text)):\s*/im,
    "",
  );

  // If we still see fragments of thinking tags at the start, extract everything after them
  const afterThinking = cleaned.match(
    /(?:<\/think(?:ing)?>|think(?:ing)?>)\s*([\s\S]*)/i,
  );
  if (afterThinking && afterThinking[1]) {
    cleaned = afterThinking[1].trim();
  }

  return cleaned.trim() || text.trim(); // Fallback to original if we stripped everything
}
