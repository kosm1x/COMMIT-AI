import { fetchWithRetry } from "../utils/fetchWithRetry";
import { supabase } from "../lib/supabase";
import { RateLimiter } from "../utils/security";
import {
  safeParse,
  AnalysisResultSchema,
  ObjectivesArraySchema,
  MindMapSchema,
  CompleteIdeaSchema,
  IdeaConnectionsArraySchema,
  DivergentPathsArraySchema,
  NextStepsArraySchema,
  CriticalAnalysisSchema,
  RelatedConceptsArraySchema,
  SuggestedObjectivesArraySchema,
  SuggestedTasksArraySchema,
} from "../lib/aiSchemas";

const aiRateLimiter = new RateLimiter(10, 1);

interface EmotionResult {
  name: string;
  intensity: number;
  color: string;
}

interface AnalysisResult {
  emotions: EmotionResult[];
  patterns: string[];
  coping_strategies: string[];
  primary_emotion: string;
}

const emotionColors: { [key: string]: string } = {
  happy: "bg-yellow-500",
  sad: "bg-blue-500",
  angry: "bg-red-500",
  anxious: "bg-orange-500",
  calm: "bg-green-500",
  excited: "bg-pink-500",
  frustrated: "bg-purple-500",
  hopeful: "bg-teal-500",
  overwhelmed: "bg-indigo-500",
  grateful: "bg-emerald-500",
  determined: "bg-cyan-500",
  confused: "bg-gray-500",
};

/**
 * Call AI via Supabase Edge Function proxy (ai-proxy)
 * The Edge Function holds the Groq API key server-side, appends language
 * instructions, and forwards to Groq. Requires authenticated session.
 * @returns The text response, or null on any failure (triggers mock fallback)
 */
async function callLLM(
  prompt: string,
  temperature: number,
  max_tokens: number,
  top_p: number = 0.95,
  reasoning_effort?: "default" | "low" | "medium" | "high",
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<string | null> {
  if (!aiRateLimiter.canProceed()) {
    return null;
  }

  const internalController = new AbortController();
  const timeoutId = setTimeout(() => internalController.abort(), 30_000);
  if (signal) {
    signal.addEventListener("abort", () => internalController.abort(), {
      once: true,
    });
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      return null;
    }

    const body: Record<string, unknown> = {
      prompt,
      temperature,
      max_tokens,
      top_p,
      language,
    };

    if (reasoning_effort) {
      body.reasoning_effort = reasoning_effort;
    }

    const response = await fetchWithRetry(
      `${supabaseUrl}/functions/v1/ai-proxy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
        signal: internalController.signal,
      },
      {
        maxRetries: 2,
        baseDelay: 1000,
        retryOn: (res) => res.status >= 500 || res.status === 429,
      },
    );

    if (!response.ok) {
      console.error("AI proxy error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.content || null;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.warn("AI call aborted or timed out");
      return null;
    }
    console.error("Error calling AI proxy:", error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function analyzeJournalEntry(
  content: string,
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  const prompt = `Analyze this journal entry and provide emotional insights, patterns, and coping strategies. Return your response in JSON format with the following structure:
{
  "emotions": [{"name": "emotion name", "intensity": 0-100}],
  "patterns": ["pattern1", "pattern2", "pattern3"],
  "coping_strategies": ["strategy1", "strategy2", "strategy3"],
  "primary_emotion": "the single most dominant emotion"
}

Journal Entry:
${content}

Focus on:
1. Identify 3-5 key emotions with intensity scores (0-100)
2. Detect recurring themes, situations, or behavioral patterns
3. Suggest practical, actionable coping strategies based on the emotional state
4. Identify the single most important/dominant emotion as primary_emotion (just the emotion name)

Return ONLY the JSON object, no additional text.`;

  const textResponse = await callLLM(
    prompt,
    0.7,
    1024,
    0.95,
    "default",
    language,
    signal,
  );

  if (!textResponse) {
    return generateMockAnalysis(content, language);
  }

  try {
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      const parsedResult = safeParse(AnalysisResultSchema, raw, null);
      if (!parsedResult) return generateMockAnalysis(content, language);

      interface ParsedEmotion {
        name: string;
        intensity: number;
      }
      const emotions = parsedResult.emotions.map((emotion: ParsedEmotion) => ({
        name: emotion.name,
        intensity: emotion.intensity,
        color: getEmotionColor(emotion.name),
      }));

      return {
        emotions,
        patterns: parsedResult.patterns || [],
        coping_strategies: parsedResult.coping_strategies || [],
        primary_emotion:
          parsedResult.primary_emotion || emotions[0]?.name || "neutral",
      };
    }

    return generateMockAnalysis(content, language);
  } catch (error) {
    console.error("Error analyzing journal entry:", error);
    return generateMockAnalysis(content, language);
  }
}

function getEmotionColor(emotionName: string): string {
  const normalized = emotionName.toLowerCase();
  for (const [key, color] of Object.entries(emotionColors)) {
    if (normalized.includes(key)) {
      return color;
    }
  }
  return "bg-gray-500";
}

function generateMockAnalysis(
  content: string,
  language: "en" | "es" | "zh" = "en",
): AnalysisResult {
  const mockData: Record<
    "en" | "es" | "zh",
    {
      emotions: EmotionResult[];
      patterns: string[];
      copingStrategies: string[];
    }
  > = {
    en: {
      emotions: [
        { name: "Determined", intensity: 75, color: "bg-cyan-500" },
        { name: "Hopeful", intensity: 65, color: "bg-teal-500" },
        { name: "Focused", intensity: 80, color: "bg-blue-500" },
      ],
      patterns: [
        "Consistent focus on personal development and growth",
        "Balancing multiple priorities and commitments",
        "Strong motivation toward achieving goals",
      ],
      copingStrategies: [
        "Break down large goals into smaller, manageable daily actions",
        "Schedule regular breaks to maintain energy and focus",
        "Practice mindfulness or deep breathing when feeling overwhelmed",
        "Celebrate small wins to maintain motivation",
      ],
    },
    es: {
      emotions: [
        { name: "Determinado", intensity: 75, color: "bg-cyan-500" },
        { name: "Esperanzado", intensity: 65, color: "bg-teal-500" },
        { name: "Concentrado", intensity: 80, color: "bg-blue-500" },
      ],
      patterns: [
        "Enfoque consistente en desarrollo personal y crecimiento",
        "Equilibrio entre múltiples prioridades y compromisos",
        "Fuerte motivación hacia el logro de objetivos",
      ],
      copingStrategies: [
        "Divide objetivos grandes en acciones diarias más pequeñas y manejables",
        "Programa descansos regulares para mantener energía y enfoque",
        "Practica atención plena o respiración profunda cuando te sientas abrumado",
        "Celebra las pequeñas victorias para mantener la motivación",
      ],
    },
    zh: {
      emotions: [
        { name: "坚定", intensity: 75, color: "bg-cyan-500" },
        { name: "充满希望", intensity: 65, color: "bg-teal-500" },
        { name: "专注", intensity: 80, color: "bg-blue-500" },
      ],
      patterns: [
        "持续关注个人发展和成长",
        "平衡多个优先事项和承诺",
        "强烈追求目标的动机",
      ],
      copingStrategies: [
        "将大目标分解为更小、可管理的日常行动",
        "安排定期休息以保持精力和专注",
        "感到不知所措时练习正念或深呼吸",
        "庆祝小胜利以保持动力",
      ],
    },
  };

  const data = mockData[language];
  const commonEmotions: EmotionResult[] = [...data.emotions];

  if (
    content.toLowerCase().includes("stress") ||
    content.toLowerCase().includes("anxious") ||
    content.toLowerCase().includes("estrés") ||
    content.toLowerCase().includes("ansioso") ||
    content.toLowerCase().includes("压力") ||
    content.toLowerCase().includes("焦虑")
  ) {
    const anxiousEmotions: Record<"en" | "es" | "zh", EmotionResult> = {
      en: { name: "Anxious", intensity: 60, color: "bg-orange-500" },
      es: { name: "Ansioso", intensity: 60, color: "bg-orange-500" },
      zh: { name: "焦虑", intensity: 60, color: "bg-orange-500" },
    };
    commonEmotions.push(anxiousEmotions[language]);
  }

  if (
    content.toLowerCase().includes("happy") ||
    content.toLowerCase().includes("great") ||
    content.toLowerCase().includes("feliz") ||
    content.toLowerCase().includes("genial") ||
    content.toLowerCase().includes("快乐") ||
    content.toLowerCase().includes("很好")
  ) {
    const happyEmotions: Record<"en" | "es" | "zh", EmotionResult> = {
      en: { name: "Happy", intensity: 85, color: "bg-yellow-500" },
      es: { name: "Feliz", intensity: 85, color: "bg-yellow-500" },
      zh: { name: "快乐", intensity: 85, color: "bg-yellow-500" },
    };
    commonEmotions.push(happyEmotions[language]);
  }

  if (
    content.toLowerCase().includes("tired") ||
    content.toLowerCase().includes("exhausted") ||
    content.toLowerCase().includes("cansado") ||
    content.toLowerCase().includes("agotado") ||
    content.toLowerCase().includes("累") ||
    content.toLowerCase().includes("疲惫")
  ) {
    const overwhelmedEmotions: Record<"en" | "es" | "zh", EmotionResult> = {
      en: { name: "Overwhelmed", intensity: 55, color: "bg-indigo-500" },
      es: { name: "Abrumado", intensity: 55, color: "bg-indigo-500" },
      zh: { name: "不知所措", intensity: 55, color: "bg-indigo-500" },
    };
    commonEmotions.push(overwhelmedEmotions[language]);
  }

  const patterns = [...data.patterns];
  const workKeywords = {
    en: ["work"],
    es: ["trabajo", "laboral"],
    zh: ["工作"],
  };
  if (
    workKeywords[language].some((keyword) =>
      content.toLowerCase().includes(keyword),
    )
  ) {
    const workPatterns: Record<"en" | "es" | "zh", string> = {
      en: "Work-related themes and professional development",
      es: "Temas relacionados con el trabajo y desarrollo profesional",
      zh: "与工作相关的主题和专业发展",
    };
    patterns.push(workPatterns[language]);
  }

  const copingStrategies = [...data.copingStrategies];

  const selectedEmotions = commonEmotions.slice(0, 4);
  return {
    emotions: selectedEmotions,
    patterns: patterns.slice(0, 3),
    coping_strategies: copingStrategies.slice(0, 3),
    primary_emotion: selectedEmotions[0]?.name || "neutral",
  };
}

export async function extractObjectivesFromJournal(
  content: string,
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<string[]> {
  const prompt = `Extract potential goals or objectives from this journal entry. Return a JSON array of strings, each representing a goal or objective the person might want to pursue. If no clear goals are mentioned, return an empty array.

Journal Entry:
${content}

Return ONLY a JSON array like: ["goal1", "goal2", "goal3"]`;

  const textResponse = await callLLM(
    prompt,
    0.5,
    512,
    0.95,
    undefined,
    language,
    signal,
  );

  if (!textResponse) {
    return [];
  }

  try {
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      const parsed = safeParse(ObjectivesArraySchema, raw, null);
      if (!parsed) return [];
      return parsed;
    }

    return [];
  } catch (error) {
    console.error("Error extracting objectives:", error);
    return [];
  }
}

interface MindMapResult {
  mermaidSyntax: string;
  title: string;
}

export async function generateMindMap(
  problemStatement: string,
  context?: string,
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<MindMapResult> {
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

  const textResponse = await callLLM(
    prompt,
    0.7,
    2048,
    0.95,
    "default",
    language,
    signal,
  );

  if (!textResponse) {
    return generateMockMindMap(problemStatement, context, language);
  }

  try {
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      const parsedResult = safeParse(MindMapSchema, raw, null);
      if (!parsedResult)
        return generateMockMindMap(problemStatement, context, language);
      const defaultTitles: Record<"en" | "es" | "zh", string> = {
        en: "Mind Map",
        es: "Mapa Mental",
        zh: "思维导图",
      };
      return {
        title: parsedResult.title || defaultTitles[language],
        mermaidSyntax: parsedResult.mermaidSyntax || "",
      };
    }

    return generateMockMindMap(problemStatement, context, language);
  } catch (error) {
    console.error("Error generating mind map:", error);
    return generateMockMindMap(problemStatement, context, language);
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
    console.error("Error completing idea:", error);
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

interface IdeaConnection {
  ideaId: string;
  ideaTitle: string;
  connectionType: "similar" | "complementary" | "prerequisite" | "related";
  strength: number;
  reason: string;
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
    console.log("[findIdeaConnections] No existing ideas to compare");
    return [];
  }

  console.log(
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
  );

  if (!textResponse) {
    console.warn(
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

  console.log(
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

      console.log(
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
            console.warn(
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

      console.log(
        `[findIdeaConnections] Filtered to ${filteredConnections.length} connections with strength >= ${MIN_STRENGTH_THRESHOLD}`,
      );

      // If no AI connections found, use strict fallback
      if (filteredConnections.length === 0) {
        console.log(
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
      console.warn(
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
    console.error("[findIdeaConnections] Error parsing connections:", error);
    console.error(
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

// Common English stopwords to filter out when extracting keywords
// Multi-language stopwords
const STOPWORDS: Record<string, Set<string>> = {
  en: new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "as",
    "is",
    "was",
    "are",
    "were",
    "been",
    "be",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "can",
    "need",
    "dare",
    "ought",
    "used",
    "it",
    "its",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "we",
    "they",
    "what",
    "which",
    "who",
    "whom",
    "when",
    "where",
    "why",
    "how",
    "all",
    "each",
    "every",
    "both",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "only",
    "own",
    "same",
    "so",
    "than",
    "too",
    "very",
    "just",
    "also",
    "now",
    "here",
    "there",
    "then",
    "once",
    "if",
    "about",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "under",
    "again",
    "further",
    "any",
    "your",
    "my",
    "our",
    "their",
    "his",
    "her",
    "up",
    "down",
    "out",
    "off",
    "over",
    "under",
    "while",
    "because",
    "until",
    "although",
    "though",
    "since",
    "unless",
    "however",
    "therefore",
    "thus",
    "hence",
    "yet",
    "still",
    "already",
    "always",
    "never",
    "often",
    "sometimes",
    "usually",
    "generally",
    "probably",
    "perhaps",
    "maybe",
    "really",
    "actually",
    "basically",
    "simply",
    "get",
    "got",
    "make",
    "made",
    "like",
    "use",
    "using",
    "used",
    "way",
    "ways",
    "thing",
    "things",
    "something",
    "nothing",
    "everything",
    "anything",
    "someone",
    "anyone",
    "everyone",
    "one",
    "two",
    "first",
    "new",
  ]),
  es: new Set([
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "unos",
    "unas",
    "y",
    "o",
    "pero",
    "en",
    "con",
    "de",
    "del",
    "al",
    "a",
    "para",
    "por",
    "como",
    "es",
    "son",
    "era",
    "fueron",
    "ser",
    "estar",
    "he",
    "ha",
    "han",
    "haber",
    "tener",
    "tiene",
    "tienen",
    "hacer",
    "hace",
    "hacen",
    "lo",
    "le",
    "les",
    "se",
    "su",
    "sus",
    "mi",
    "mis",
    "tu",
    "tus",
    "este",
    "ese",
    "aquel",
    "esta",
    "esa",
    "aquella",
    "estos",
    "esos",
    "aquellos",
    "yo",
    "tú",
    "él",
    "ella",
    "nosotros",
    "vosotros",
    "ellos",
    "ellas",
    "que",
    "quien",
    "cual",
    "cuando",
    "donde",
    "por qué",
    "cómo",
    "todo",
    "cada",
    "muy",
    "más",
    "menos",
    "otro",
    "otra",
    "algunos",
    "algunas",
    "ninguno",
    "ninguna",
    "solo",
    "también",
    "tampoco",
    "sí",
    "no",
    "ni",
    "ahora",
    "entonces",
    "aquí",
    "allí",
    "después",
    "antes",
    "durante",
    "sobre",
    "bajo",
    "entre",
    "desde",
    "hasta",
    "sin",
    "según",
    "si",
    "aunque",
    "porque",
    "mientras",
    "cuando",
    "siempre",
    "nunca",
    "ya",
    "aún",
    "todavía",
    "puede",
    "pueden",
    "debe",
    "deben",
    "decir",
    "dice",
    "dicen",
    "dar",
    "da",
    "dan",
  ]),
  zh: new Set([
    "的",
    "了",
    "在",
    "是",
    "我",
    "有",
    "和",
    "就",
    "不",
    "人",
    "都",
    "一",
    "一个",
    "上",
    "也",
    "很",
    "到",
    "说",
    "要",
    "去",
    "你",
    "会",
    "着",
    "没有",
    "看",
    "好",
    "自己",
    "这",
    "那",
    "里",
    "他",
    "她",
    "它",
    "们",
    "为",
    "与",
    "中",
    "对",
    "而",
    "用",
    "能",
    "可以",
    "但",
    "却",
    "或",
    "因为",
    "所以",
    "如果",
    "虽然",
    "但是",
    "然后",
    "因此",
    "现在",
    "已经",
    "还",
    "又",
    "再",
    "更",
    "最",
    "太",
    "非常",
    "比较",
    "什么",
    "怎么",
    "为什么",
    "多少",
    "哪里",
    "谁",
    "怎样",
    "这个",
    "那个",
    "这些",
    "那些",
    "每个",
    "所有",
    "一些",
    "几个",
    "其他",
    "别的",
    "另外",
    "自",
    "之",
    "于",
    "以",
    "及",
    "乃",
    "则",
    "将",
    "由",
    "从",
    "给",
    "向",
    "让",
    "被",
    "把",
    "得",
    "过",
    "着",
    "了",
    "啊",
    "吗",
    "呢",
    "吧",
    "哦",
  ]),
};

// Extract significant keywords from text (title + content) with language awareness
function extractKeywords(
  text: string,
  maxKeywords: number = 30,
  language: "en" | "es" | "zh" = "en",
): string[] {
  const stopwordsSet = STOPWORDS[language] || STOPWORDS.en;

  // For Chinese, use character-based matching (2+ characters)
  // For Spanish/English, use word-based matching (3+ characters)
  let words: string[];
  if (language === "zh") {
    // Chinese: extract sequences of Chinese characters
    const matches = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    words = matches;
  } else {
    // Spanish/English: normalize and tokenize
    const normalized = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
    words = normalized.split(" ");
  }

  // Count word frequency
  const wordFreq: Map<string, number> = new Map();

  for (const word of words) {
    const minLength = language === "zh" ? 2 : 3;
    // Filter: min length, not a stopword, not a number
    if (
      word.length >= minLength &&
      !stopwordsSet.has(word) &&
      !/^\d+$/.test(word)
    ) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  // Sort by frequency and return top keywords
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

// Calculate content similarity score using keyword overlap
function calculateContentSimilarity(
  keywords1: string[],
  keywords2: string[],
): { score: number; commonKeywords: string[] } {
  if (keywords1.length === 0 || keywords2.length === 0) {
    return { score: 0, commonKeywords: [] };
  }

  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  // Find common keywords
  const commonKeywords = keywords1.filter((k) => set2.has(k));

  // Jaccard-like similarity with position weighting
  // Earlier keywords (more frequent) get more weight
  let weightedScore = 0;
  for (let i = 0; i < commonKeywords.length; i++) {
    const pos1 = keywords1.indexOf(commonKeywords[i]);
    const pos2 = keywords2.indexOf(commonKeywords[i]);
    // Higher weight for keywords that appear early (high frequency) in both lists
    const positionWeight = 1 / (1 + Math.min(pos1, pos2) * 0.1);
    weightedScore += positionWeight;
  }

  // Normalize by the size of the smaller keyword set
  const minSize = Math.min(set1.size, set2.size);
  const normalizedScore = minSize > 0 ? (weightedScore / minSize) * 100 : 0;

  return {
    score: Math.min(100, normalizedScore),
    commonKeywords: commonKeywords.slice(0, 5), // Top 5 for display
  };
}

// Improved fallback function with content analysis
function findSimilarIdeasFallback(
  _currentIdea: string,
  currentTitle: string,
  currentContent: string,
  existingIdeas: {
    id: string;
    title: string;
    content: string;
    tags?: string[];
  }[],
  currentIdeaMeta?: { title: string; tags?: string[] },
  language: "en" | "es" | "zh" = "en",
): IdeaConnection[] {
  const connections: IdeaConnection[] = [];
  const currentTitleLower = currentTitle.toLowerCase().trim();
  const currentTags = new Set(
    (currentIdeaMeta?.tags || []).map((t) => t.toLowerCase().trim()),
  );

  // Normalize title for comparison
  const normalizeTitle = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const normalizedCurrentTitle = normalizeTitle(currentTitle);

  // Extract keywords from current idea (title + content combined for richer analysis)
  const currentFullText = `${currentTitle} ${currentTitle} ${currentContent}`; // Title weighted 2x
  const currentKeywords = extractKeywords(currentFullText, 40, language);
  const currentTitleKeywords = extractKeywords(currentTitle, 10, language);

  console.log(
    `[findSimilarIdeasFallback] Current idea keywords: ${currentKeywords.slice(0, 10).join(", ")}...`,
  );

  existingIdeas.forEach((idea) => {
    const ideaTitleLower = idea.title.toLowerCase().trim();
    const normalizedIdeaTitle = normalizeTitle(idea.title);
    const ideaTags = new Set(
      (idea.tags || []).map((t) => t.toLowerCase().trim()),
    );

    // Extract keywords from comparison idea
    const ideaFullText = `${idea.title} ${idea.title} ${idea.content}`;
    const ideaKeywords = extractKeywords(ideaFullText, 40, language);
    const ideaTitleKeywords = extractKeywords(idea.title, 10, language);

    let bestScore = 0;
    let bestReason = "";
    let bestType: "similar" | "complementary" | "prerequisite" | "related" =
      "related";

    // PRIORITY 1: Exact title match (highest confidence)
    if (currentTitleLower === ideaTitleLower) {
      connections.push({
        ideaId: idea.id,
        ideaTitle: idea.title,
        connectionType: "similar",
        strength: 95,
        reason: "Identical title",
      });
      return;
    }

    // PRIORITY 2: Title word similarity
    const currentTitleWords = normalizedCurrentTitle
      .split(/\s+/)
      .filter((w) => w.length >= 2);
    const ideaTitleWords = normalizedIdeaTitle
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    if (currentTitleWords.length > 0 && ideaTitleWords.length > 0) {
      const commonTitleWords = currentTitleWords.filter((w) =>
        ideaTitleWords.includes(w),
      );
      const titleSimilarityRatio =
        commonTitleWords.length /
        Math.max(currentTitleWords.length, ideaTitleWords.length);

      if (titleSimilarityRatio >= 0.5 && commonTitleWords.length >= 2) {
        const titleScore = 70 + Math.round(titleSimilarityRatio * 25);
        if (titleScore > bestScore) {
          bestScore = titleScore;
          bestReason = `Similar titles (${commonTitleWords.join(", ")})`;
          bestType = "similar";
        }
      }
    }

    // PRIORITY 3: Content keyword similarity (NEW - the main improvement)
    const { score: contentScore, commonKeywords } = calculateContentSimilarity(
      currentKeywords,
      ideaKeywords,
    );

    if (commonKeywords.length >= 3) {
      // Strong content connection
      const adjustedContentScore = Math.min(
        90,
        65 + commonKeywords.length * 3 + contentScore * 0.2,
      );

      if (adjustedContentScore > bestScore) {
        bestScore = adjustedContentScore;
        bestReason = `Shared concepts: ${commonKeywords.slice(0, 4).join(", ")}`;
        bestType = commonKeywords.length >= 5 ? "similar" : "related";
      }
    } else if (commonKeywords.length >= 2 && contentScore >= 15) {
      // Moderate content connection
      const adjustedContentScore = 70 + commonKeywords.length * 2;

      if (adjustedContentScore > bestScore) {
        bestScore = adjustedContentScore;
        bestReason = `Related topics: ${commonKeywords.join(", ")}`;
        bestType = "related";
      }
    }

    // PRIORITY 4: Title keywords appearing in other's content (cross-reference)
    const titleInContentMatches = currentTitleKeywords.filter((k) =>
      ideaKeywords.includes(k),
    );
    const contentInTitleMatches = ideaTitleKeywords.filter((k) =>
      currentKeywords.includes(k),
    );
    const crossRefMatches = [
      ...new Set([...titleInContentMatches, ...contentInTitleMatches]),
    ];

    if (crossRefMatches.length >= 2) {
      const crossRefScore = 72 + crossRefMatches.length * 3;
      if (crossRefScore > bestScore) {
        bestScore = crossRefScore;
        bestReason = `Topic crossover: ${crossRefMatches.slice(0, 3).join(", ")}`;
        bestType = "complementary";
      }
    }

    // PRIORITY 5: Tag overlap
    if (currentTags.size > 0 && ideaTags.size > 0) {
      const commonTags = Array.from(currentTags).filter((t) => ideaTags.has(t));

      if (commonTags.length >= 2) {
        const tagScore = 70 + commonTags.length * 5;
        if (tagScore > bestScore) {
          bestScore = tagScore;
          bestReason = `Shared tags: ${commonTags.join(", ")}`;
          bestType = "related";
        }
      } else if (commonTags.length === 1) {
        // Single tag match can boost existing score slightly
        if (bestScore > 0 && bestScore < 85) {
          bestScore = Math.min(85, bestScore + 5);
          bestReason += ` (+${commonTags[0]} tag)`;
        }
      }
    }

    // Add connection if score meets threshold
    if (bestScore >= 70) {
      connections.push({
        ideaId: idea.id,
        ideaTitle: idea.title,
        connectionType: bestType,
        strength: Math.round(bestScore),
        reason: bestReason,
      });
    }
  });

  // Sort by strength and limit to top 8 connections
  const sortedConnections = connections
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 8);

  console.log(
    `[findSimilarIdeasFallback] Found ${sortedConnections.length} connections via content-aware fallback`,
  );
  return sortedConnections;
}

interface DivergentPath {
  title: string;
  description: string;
  approach: string;
  potentialOutcome: string;
}

export async function generateDivergentPaths(
  ideaTitle: string,
  ideaContent: string,
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<DivergentPath[]> {
  const prompt = `Analyze this idea and generate 3-4 divergent paths or alternative approaches to explore it. Each path should offer a different angle, perspective, or methodology. Return a JSON array with this structure:

[
  {
    "title": "Brief, compelling title for this path (4-6 words)",
    "description": "One sentence describing this alternative approach",
    "approach": "2-3 sentences explaining how to pursue this path",
    "potentialOutcome": "What could result from following this direction"
  }
]

Current Idea:
Title: ${ideaTitle}
Content: ${ideaContent}

Make each path distinctly different - consider variations in:
- Scale (smaller/larger scope)
- Timeline (quick prototype vs long-term development)
- Audience (different user groups)
- Methodology (different techniques or approaches)
- Risk level (conservative vs experimental)

Return ONLY the JSON array, no additional text.`;

  const textResponse = await callLLM(
    prompt,
    0.9,
    1536,
    0.95,
    "default",
    language,
    signal,
  );

  if (!textResponse) {
    return generateMockDivergentPaths(ideaTitle, language);
  }

  try {
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      const parsed = safeParse(DivergentPathsArraySchema, raw, null);
      if (!parsed) return generateMockDivergentPaths(ideaTitle, language);
      return parsed;
    }

    return generateMockDivergentPaths(ideaTitle, language);
  } catch (error) {
    console.error("Error generating divergent paths:", error);
    return generateMockDivergentPaths(ideaTitle, language);
  }
}

function generateMockDivergentPaths(
  _ideaTitle: string,
  language: "en" | "es" | "zh" = "en",
): DivergentPath[] {
  const mockData: Record<"en" | "es" | "zh", DivergentPath[]> = {
    en: [
      {
        title: "Rapid Prototype Approach",
        description: "Build a minimal version quickly to test core assumptions",
        approach:
          "Focus on creating a basic working prototype within 2-4 weeks. Strip away all non-essential features and test the fundamental concept with real users.",
        potentialOutcome:
          "Fast validation of whether the core idea resonates, allowing for quick pivots if needed",
      },
      {
        title: "Research-First Strategy",
        description:
          "Deep dive into existing solutions and user needs before building",
        approach:
          "Spend 1-2 months conducting thorough market research, user interviews, and competitive analysis. Map out the landscape before committing to an approach.",
        potentialOutcome:
          "Well-informed decision making with reduced risk of building something unwanted",
      },
      {
        title: "Community-Driven Development",
        description:
          "Build in public with early adopters shaping the direction",
        approach:
          "Share your concept early with a small community of interested users. Co-create the solution by incorporating their feedback and ideas at every stage.",
        potentialOutcome:
          "Built-in user base and product-market fit through collaborative development",
      },
    ],
    es: [
      {
        title: "Enfoque de Prototipo Rápido",
        description:
          "Construye una versión mínima rápidamente para probar suposiciones centrales",
        approach:
          "Enfócate en crear un prototipo básico funcional en 2-4 semanas. Elimina todas las características no esenciales y prueba el concepto fundamental con usuarios reales.",
        potentialOutcome:
          "Validación rápida de si la idea central resuena, permitiendo pivotes rápidos si es necesario",
      },
      {
        title: "Estrategia de Investigación Primero",
        description:
          "Profundiza en soluciones existentes y necesidades del usuario antes de construir",
        approach:
          "Pasa 1-2 meses realizando investigación de mercado exhaustiva, entrevistas con usuarios y análisis competitivo. Mapea el panorama antes de comprometerte con un enfoque.",
        potentialOutcome:
          "Toma de decisiones bien informada con menor riesgo de construir algo no deseado",
      },
      {
        title: "Desarrollo Impulsado por la Comunidad",
        description:
          "Construye en público con adoptantes tempranos dando forma a la dirección",
        approach:
          "Comparte tu concepto temprano con una pequeña comunidad de usuarios interesados. Co-crea la solución incorporando sus comentarios e ideas en cada etapa.",
        potentialOutcome:
          "Base de usuarios incorporada y ajuste producto-mercado a través del desarrollo colaborativo",
      },
    ],
    zh: [
      {
        title: "快速原型方法",
        description: "快速构建最小版本以测试核心假设",
        approach:
          "专注于在2-4周内创建一个基本的工作原型。去除所有非必要功能，用真实用户测试基本概念。",
        potentialOutcome: "快速验证核心想法是否引起共鸣，允许在需要时快速调整",
      },
      {
        title: "研究优先策略",
        description: "在构建之前深入研究现有解决方案和用户需求",
        approach:
          "花费1-2个月进行彻底的市场研究、用户访谈和竞争分析。在承诺采用某种方法之前先绘制全景图。",
        potentialOutcome: "做出明智的决策，降低构建不需要的东西的风险",
      },
      {
        title: "社区驱动开发",
        description: "在公开环境中构建，让早期采用者塑造方向",
        approach:
          "尽早与一小群感兴趣的用户分享您的概念。通过在每个阶段融入他们的反馈和想法来共同创建解决方案。",
        potentialOutcome: "通过协作开发建立内置用户群和产品市场契合度",
      },
    ],
  };

  return mockData[language];
}

interface NextStep {
  step: string;
  description: string;
  timeEstimate: string;
  priority: "high" | "medium" | "low";
}

export async function suggestNextSteps(
  ideaTitle: string,
  ideaContent: string,
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<NextStep[]> {
  const prompt = `Based on this idea, suggest 4-6 specific, actionable next steps. Return a JSON array:

[
  {
    "step": "Clear, actionable step (5-8 words)",
    "description": "More details about this step and why it matters",
    "timeEstimate": "How long this might take (e.g., '2 hours', '1 week', '1 day')",
    "priority": "high|medium|low"
  }
]

Idea:
Title: ${ideaTitle}
Content: ${ideaContent}

Make steps:
- Specific and actionable (not vague)
- Ordered logically from immediate to future
- Realistic in scope
- Include a mix of quick wins and substantial work

Return ONLY the JSON array, no additional text.`;

  const textResponse = await callLLM(
    prompt,
    0.7,
    1024,
    0.95,
    undefined,
    language,
    signal,
  );

  if (!textResponse) {
    return generateMockNextSteps(language);
  }

  try {
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      const parsed = safeParse(NextStepsArraySchema, raw, null);
      if (!parsed) return generateMockNextSteps(language);
      return parsed as NextStep[];
    }

    return generateMockNextSteps(language);
  } catch (error) {
    console.error("Error suggesting next steps:", error);
    return generateMockNextSteps(language);
  }
}

function generateMockNextSteps(
  language: "en" | "es" | "zh" = "en",
): NextStep[] {
  const mockData: Record<"en" | "es" | "zh", NextStep[]> = {
    en: [
      {
        step: "Define core requirements and constraints",
        description:
          "Clarify what success looks like and identify any limitations or boundaries",
        timeEstimate: "2-3 hours",
        priority: "high",
      },
      {
        step: "Research existing solutions",
        description:
          "Look for similar ideas or approaches to learn from successes and failures",
        timeEstimate: "1 day",
        priority: "high",
      },
      {
        step: "Create a simple action plan",
        description: "Break down the idea into phases with clear milestones",
        timeEstimate: "3-4 hours",
        priority: "medium",
      },
      {
        step: "Identify potential collaborators",
        description:
          "Find people with complementary skills who could help or provide feedback",
        timeEstimate: "1-2 days",
        priority: "medium",
      },
    ],
    es: [
      {
        step: "Definir requisitos y restricciones principales",
        description:
          "Aclarar cómo se ve el éxito e identificar cualquier limitación o límite",
        timeEstimate: "2-3 horas",
        priority: "high",
      },
      {
        step: "Investigar soluciones existentes",
        description:
          "Buscar ideas o enfoques similares para aprender de éxitos y fracasos",
        timeEstimate: "1 día",
        priority: "high",
      },
      {
        step: "Crear un plan de acción simple",
        description: "Dividir la idea en fases con hitos claros",
        timeEstimate: "3-4 horas",
        priority: "medium",
      },
      {
        step: "Identificar colaboradores potenciales",
        description:
          "Encontrar personas con habilidades complementarias que puedan ayudar o proporcionar comentarios",
        timeEstimate: "1-2 días",
        priority: "medium",
      },
    ],
    zh: [
      {
        step: "定义核心要求和约束",
        description: "明确成功的样子并识别任何限制或边界",
        timeEstimate: "2-3小时",
        priority: "high",
      },
      {
        step: "研究现有解决方案",
        description: "寻找类似的想法或方法，从成功和失败中学习",
        timeEstimate: "1天",
        priority: "high",
      },
      {
        step: "创建简单的行动计划",
        description: "将想法分解为具有明确里程碑的阶段",
        timeEstimate: "3-4小时",
        priority: "medium",
      },
      {
        step: "确定潜在合作者",
        description: "找到具有互补技能的人，他们可以提供帮助或反馈",
        timeEstimate: "1-2天",
        priority: "medium",
      },
    ],
  };

  return mockData[language];
}

interface CriticalAnalysis {
  strengths: string[];
  challenges: string[];
  assumptions: string[];
  alternativePerspectives: string[];
}

export async function generateCriticalAnalysis(
  ideaTitle: string,
  ideaContent: string,
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<CriticalAnalysis> {
  const prompt = `Provide a balanced critical analysis of this idea. Return JSON:

{
  "strengths": ["strength1", "strength2", "strength3"],
  "challenges": ["challenge1", "challenge2", "challenge3"],
  "assumptions": ["assumption1", "assumption2", "assumption3"],
  "alternativePerspectives": ["perspective1", "perspective2"]
}

Idea:
Title: ${ideaTitle}
Content: ${ideaContent}

Provide:
- 3-4 key strengths or advantages
- 3-4 potential challenges or obstacles
- 3-4 underlying assumptions that might need validation
- 2-3 alternative ways to view or frame this idea

Be constructive but honest. Help strengthen the idea through critical thinking.

Return ONLY the JSON object, no additional text.`;

  const textResponse = await callLLM(
    prompt,
    0.6,
    1024,
    0.95,
    "default",
    language,
    signal,
  );

  if (!textResponse) {
    return generateMockCriticalAnalysis(language);
  }

  try {
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      const parsed = safeParse(CriticalAnalysisSchema, raw, null);
      if (!parsed) return generateMockCriticalAnalysis(language);
      return parsed;
    }

    return generateMockCriticalAnalysis(language);
  } catch (error) {
    console.error("Error generating critical analysis:", error);
    return generateMockCriticalAnalysis(language);
  }
}

function generateMockCriticalAnalysis(
  language: "en" | "es" | "zh" = "en",
): CriticalAnalysis {
  const mockData: Record<"en" | "es" | "zh", CriticalAnalysis> = {
    en: {
      strengths: [
        "Addresses a clear need or problem area",
        "Can be started with existing resources",
        "Has potential for iterative improvement",
      ],
      challenges: [
        "May require significant time investment",
        "Success depends on factors outside your control",
        "Competition or similar solutions might exist",
      ],
      assumptions: [
        "Target users will value this solution",
        "Required resources will be accessible",
        "Timeline is realistic given constraints",
      ],
      alternativePerspectives: [
        "Consider starting smaller and scaling up based on feedback",
        "Could partner with others rather than building alone",
      ],
    },
    es: {
      strengths: [
        "Aborda una necesidad o área problemática clara",
        "Puede iniciarse con recursos existentes",
        "Tiene potencial para mejora iterativa",
      ],
      challenges: [
        "Puede requerir una inversión de tiempo significativa",
        "El éxito depende de factores fuera de tu control",
        "Puede existir competencia o soluciones similares",
      ],
      assumptions: [
        "Los usuarios objetivo valorarán esta solución",
        "Los recursos requeridos serán accesibles",
        "El cronograma es realista dados los límites",
      ],
      alternativePerspectives: [
        "Considera comenzar más pequeño y escalar según los comentarios",
        "Podrías asociarte con otros en lugar de construir solo",
      ],
    },
    zh: {
      strengths: [
        "解决明确的需求或问题领域",
        "可以用现有资源开始",
        "具有迭代改进的潜力",
      ],
      challenges: [
        "可能需要大量时间投入",
        "成功取决于您无法控制的因素",
        "可能存在竞争或类似的解决方案",
      ],
      assumptions: [
        "目标用户会重视这个解决方案",
        "所需资源将可访问",
        "考虑到约束条件，时间表是现实的",
      ],
      alternativePerspectives: [
        "考虑从小规模开始，根据反馈进行扩展",
        "可以与他人合作而不是独自构建",
      ],
    },
  };

  return mockData[language];
}

interface RelatedConcept {
  concept: string;
  description: string;
  relevance: string;
  resources: string[];
}

export async function generateRelatedConcepts(
  ideaTitle: string,
  ideaContent: string,
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<RelatedConcept[]> {
  const prompt = `Identify 3-4 related concepts, frameworks, or methodologies that connect to this idea. Return JSON array:

[
  {
    "concept": "Name of the concept/framework",
    "description": "Brief explanation of what it is",
    "relevance": "How it relates to this idea",
    "resources": ["book/article/course title", "another resource"]
  }
]

Idea:
Title: ${ideaTitle}
Content: ${ideaContent}

Suggest concepts that:
- Could enhance or inform this idea
- Provide useful mental models or frameworks
- Come from various domains (business, psychology, design, etc.)
- Include practical resources for learning more

Return ONLY the JSON array, no additional text.`;

  const textResponse = await callLLM(
    prompt,
    0.7,
    1536,
    0.95,
    "default",
    language,
    signal,
  );

  if (!textResponse) {
    return generateMockRelatedConcepts(language);
  }

  try {
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      const parsed = safeParse(RelatedConceptsArraySchema, raw, null);
      if (!parsed) return generateMockRelatedConcepts(language);
      return parsed;
    }

    return generateMockRelatedConcepts(language);
  } catch (error) {
    console.error("Error generating related concepts:", error);
    return generateMockRelatedConcepts(language);
  }
}

function generateMockRelatedConcepts(
  language: "en" | "es" | "zh" = "en",
): RelatedConcept[] {
  const mockData: Record<"en" | "es" | "zh", RelatedConcept[]> = {
    en: [
      {
        concept: "Lean Startup Methodology",
        description: "Build-measure-learn approach to developing products",
        relevance:
          "Helps validate assumptions quickly through rapid experimentation",
        resources: [
          "The Lean Startup by Eric Ries",
          "Running Lean by Ash Maurya",
        ],
      },
      {
        concept: "Design Thinking",
        description:
          "Human-centered approach to innovation and problem-solving",
        relevance: "Ensures your solution addresses real user needs",
        resources: [
          "IDEO Design Thinking resources",
          "Stanford d.school methodology",
        ],
      },
      {
        concept: "Systems Thinking",
        description: "Understanding how different parts interact as a whole",
        relevance: "Reveals hidden connections and unintended consequences",
        resources: ["Thinking in Systems by Donella Meadows"],
      },
    ],
    es: [
      {
        concept: "Metodología Lean Startup",
        description:
          "Enfoque construir-medir-aprender para desarrollar productos",
        relevance:
          "Ayuda a validar suposiciones rápidamente a través de experimentación rápida",
        resources: [
          "The Lean Startup por Eric Ries",
          "Running Lean por Ash Maurya",
        ],
      },
      {
        concept: "Design Thinking",
        description:
          "Enfoque centrado en el ser humano para la innovación y resolución de problemas",
        relevance:
          "Asegura que tu solución aborde las necesidades reales del usuario",
        resources: [
          "Recursos de Design Thinking de IDEO",
          "Metodología de Stanford d.school",
        ],
      },
      {
        concept: "Pensamiento Sistémico",
        description:
          "Comprender cómo las diferentes partes interactúan como un todo",
        relevance: "Revela conexiones ocultas y consecuencias no deseadas",
        resources: ["Thinking in Systems por Donella Meadows"],
      },
    ],
    zh: [
      {
        concept: "精益创业方法论",
        description: "构建-测量-学习的产品开发方法",
        relevance: "通过快速实验帮助快速验证假设",
        resources: ["Eric Ries的《精益创业》", "Ash Maurya的《Running Lean》"],
      },
      {
        concept: "设计思维",
        description: "以人为中心的创新和问题解决方法",
        relevance: "确保您的解决方案解决真实的用户需求",
        resources: ["IDEO设计思维资源", "斯坦福d.school方法论"],
      },
      {
        concept: "系统思维",
        description: "理解不同部分如何作为一个整体相互作用",
        relevance: "揭示隐藏的连接和意外后果",
        resources: ["Donella Meadows的《系统思考》"],
      },
    ],
  };

  return mockData[language];
}

export interface SuggestedObjective {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  reasoning: string;
}

export async function suggestObjectivesForGoal(
  goalTitle: string,
  goalDescription: string,
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<SuggestedObjective[]> {
  const prompt = `You are analyzing a goal to break it down into actionable objectives. Consider BOTH the title and the full description to understand the complete context and intent.

GOAL ANALYSIS:
Title: "${goalTitle}"
Description: ${goalDescription || "(No description provided)"}

Task: Generate 3-5 concrete, measurable objectives that would help achieve this specific goal. Each objective should directly relate to elements mentioned in the title or description.

Return JSON array with this structure:
[
  {
    "title": "Clear, specific objective (5-8 words)",
    "description": "Detailed explanation of what needs to be done (1-2 sentences)",
    "priority": "high|medium|low",
    "reasoning": "Brief explanation linking this objective to the goal's title or description (1 sentence)"
  }
]

Guidelines:
- Make objectives SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- Order by priority (high priority first)
- Focus on concrete deliverables or milestones that directly support the goal
- Each objective should be independently achievable
- Ensure objectives cover different aspects mentioned in the goal's title and description
- Reference specific elements from the goal description when creating objectives

Return ONLY the JSON array, no additional text.`;

  const textResponse = await callLLM(
    prompt,
    0.7,
    1536,
    0.95,
    "default",
    language,
    signal,
  );

  if (!textResponse) {
    return generateMockObjectives(goalTitle, language);
  }

  try {
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      const parsed = safeParse(SuggestedObjectivesArraySchema, raw, null);
      if (!parsed) return generateMockObjectives(goalTitle, language);
      return parsed as SuggestedObjective[];
    }
    return generateMockObjectives(goalTitle, language);
  } catch (error) {
    console.error("Error generating objectives:", error);
    return generateMockObjectives(goalTitle, language);
  }
}

function generateMockObjectives(
  _goalTitle: string,
  language: "en" | "es" | "zh" = "en",
): SuggestedObjective[] {
  const mockData: Record<"en" | "es" | "zh", SuggestedObjective[]> = {
    en: [
      {
        title: "Define success metrics and KPIs",
        description:
          "Establish clear, measurable indicators to track progress toward this goal.",
        priority: "high",
        reasoning:
          "Without metrics, you cannot measure progress or know when the goal is achieved.",
      },
      {
        title: "Create detailed action plan",
        description:
          "Break down the goal into specific tasks with timelines and responsibilities.",
        priority: "high",
        reasoning: "A structured plan turns aspirations into executable steps.",
      },
      {
        title: "Identify required resources",
        description:
          "List all tools, budget, people, and information needed to achieve the goal.",
        priority: "medium",
        reasoning:
          "Resource planning prevents roadblocks and ensures smooth execution.",
      },
    ],
    es: [
      {
        title: "Definir métricas de éxito y KPIs",
        description:
          "Establecer indicadores claros y medibles para rastrear el progreso hacia este objetivo.",
        priority: "high",
        reasoning:
          "Sin métricas, no se puede medir el progreso ni saber cuándo se logra el objetivo.",
      },
      {
        title: "Crear plan de acción detallado",
        description:
          "Dividir el objetivo en tareas específicas con cronogramas y responsabilidades.",
        priority: "high",
        reasoning:
          "Un plan estructurado convierte las aspiraciones en pasos ejecutables.",
      },
      {
        title: "Identificar recursos necesarios",
        description:
          "Listar todas las herramientas, presupuesto, personas e información necesaria.",
        priority: "medium",
        reasoning:
          "La planificación de recursos previene obstáculos y asegura una ejecución fluida.",
      },
    ],
    zh: [
      {
        title: "定义成功指标和KPI",
        description: "建立明确、可衡量的指标来跟踪实现此目标的进度。",
        priority: "high",
        reasoning: "没有指标，无法衡量进度或知道何时实现目标。",
      },
      {
        title: "创建详细行动计划",
        description: "将目标分解为具有时间表和责任的具体任务。",
        priority: "high",
        reasoning: "结构化的计划将愿望转化为可执行的步骤。",
      },
      {
        title: "确定所需资源",
        description: "列出实现目标所需的所有工具、预算、人员和信息。",
        priority: "medium",
        reasoning: "资源规划可防止障碍并确保顺利执行。",
      },
    ],
  };

  return mockData[language];
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

export interface SuggestedTask {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  reasoning: string;
}

export async function suggestTasksForObjective(
  objectiveTitle: string,
  objectiveDescription: string,
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<SuggestedTask[]> {
  const prompt = `You are analyzing an objective to break it down into actionable tasks. Consider BOTH the title and the full description to understand the complete context and intent.

OBJECTIVE ANALYSIS:
Title: "${objectiveTitle}"
Description: ${objectiveDescription || "(No description provided)"}

Task: Generate 3-5 specific, actionable tasks that would help complete this objective. Each task should be concrete work that can be done and checked off.

Return JSON array with this structure:
[
  {
    "title": "Clear, actionable task (4-7 words)",
    "description": "Detailed explanation of what needs to be done (1-2 sentences)",
    "priority": "high|medium|low",
    "reasoning": "Brief explanation linking this task to the objective's title or description (1 sentence)"
  }
]

Guidelines:
- Make tasks specific and actionable (things you can actually do and complete)
- Order by priority (high priority first)
- Focus on concrete actions that directly support the objective
- Each task should be independently achievable
- Tasks should be smaller units of work than objectives
- Reference specific elements from the objective description when creating tasks

Return ONLY the JSON array, no additional text.`;

  const textResponse = await callLLM(
    prompt,
    0.7,
    1536,
    0.95,
    "default",
    language,
    signal,
  );

  if (!textResponse) {
    return generateMockTasks(objectiveTitle, language);
  }

  try {
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      const parsed = safeParse(SuggestedTasksArraySchema, raw, null);
      if (!parsed) return generateMockTasks(objectiveTitle, language);
      return parsed as SuggestedTask[];
    }
    return generateMockTasks(objectiveTitle, language);
  } catch (error) {
    console.error("Error generating tasks:", error);
    return generateMockTasks(objectiveTitle, language);
  }
}

function generateMockTasks(
  _objectiveTitle: string,
  language: "en" | "es" | "zh" = "en",
): SuggestedTask[] {
  const mockData: Record<"en" | "es" | "zh", SuggestedTask[]> = {
    en: [
      {
        title: "Research and document requirements",
        description:
          "Gather all necessary information and create a detailed requirements document.",
        priority: "high",
        reasoning:
          "Understanding requirements is the foundation for successful execution.",
      },
      {
        title: "Create initial implementation plan",
        description:
          "Break down the objective into specific steps with estimated timelines.",
        priority: "high",
        reasoning:
          "A clear plan prevents wasted effort and keeps work focused.",
      },
      {
        title: "Set up necessary tools and resources",
        description:
          "Identify and prepare all tools, accounts, and resources needed for the work.",
        priority: "medium",
        reasoning:
          "Having resources ready eliminates delays during implementation.",
      },
    ],
    es: [
      {
        title: "Investigar y documentar requisitos",
        description:
          "Reunir toda la información necesaria y crear un documento detallado de requisitos.",
        priority: "high",
        reasoning:
          "Comprender los requisitos es la base para una ejecución exitosa.",
      },
      {
        title: "Crear plan de implementación inicial",
        description:
          "Dividir el objetivo en pasos específicos con cronogramas estimados.",
        priority: "high",
        reasoning:
          "Un plan claro previene el esfuerzo desperdiciado y mantiene el trabajo enfocado.",
      },
      {
        title: "Configurar herramientas y recursos necesarios",
        description:
          "Identificar y preparar todas las herramientas, cuentas y recursos necesarios para el trabajo.",
        priority: "medium",
        reasoning:
          "Tener recursos listos elimina retrasos durante la implementación.",
      },
    ],
    zh: [
      {
        title: "研究和记录需求",
        description: "收集所有必要信息并创建详细的需求文档。",
        priority: "high",
        reasoning: "理解需求是成功执行的基础。",
      },
      {
        title: "创建初始实施计划",
        description: "将目标分解为具有预估时间表的具体步骤。",
        priority: "high",
        reasoning: "清晰的计划可防止浪费精力并保持工作专注。",
      },
      {
        title: "设置必要的工具和资源",
        description: "识别并准备工作所需的所有工具、账户和资源。",
        priority: "medium",
        reasoning: "准备好资源可消除实施过程中的延迟。",
      },
    ],
  };

  return mockData[language];
}
