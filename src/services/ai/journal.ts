import {
  safeParse,
  AnalysisResultSchema,
  ObjectivesArraySchema,
} from "../../lib/aiSchemas";
import { callLLM, aiUnavailable, aiOk } from "./callLLM";
import type { EmotionResult, AnalysisResult, AIResult } from "./callLLM";
import { emotionColors } from "./callLLM";
import { getSystemPromptForCurrentUser } from "./userContext";
import { logger } from "../../utils/logger";

export type { AnalysisResult };

export async function analyzeJournalEntry(
  content: string,
  language: "en" | "es" | "zh" = "en",
  signal?: AbortSignal,
): Promise<AIResult<AnalysisResult>> {
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

  const systemPrompt = await getSystemPromptForCurrentUser();
  const textResponse = await callLLM(
    prompt,
    0.7,
    1024,
    0.95,
    "default",
    language,
    signal,
    "analyzeJournalEntry",
    { content },
    systemPrompt,
  );

  if (!textResponse) {
    if (import.meta.env.DEV)
      return aiOk(generateMockAnalysis(content, language));
    return aiUnavailable;
  }

  try {
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]);
      const parsedResult = safeParse(AnalysisResultSchema, raw, null);
      if (!parsedResult) {
        if (import.meta.env.DEV)
          return aiOk(generateMockAnalysis(content, language));
        return aiUnavailable;
      }

      interface ParsedEmotion {
        name: string;
        intensity: number;
      }
      const emotions = parsedResult.emotions.map((emotion: ParsedEmotion) => ({
        name: emotion.name,
        intensity: emotion.intensity,
        color: getEmotionColor(emotion.name),
      }));

      return aiOk({
        emotions,
        patterns: parsedResult.patterns || [],
        coping_strategies: parsedResult.coping_strategies || [],
        primary_emotion:
          parsedResult.primary_emotion || emotions[0]?.name || "neutral",
      });
    }

    if (import.meta.env.DEV)
      return aiOk(generateMockAnalysis(content, language));
    return aiUnavailable;
  } catch (error) {
    logger.error("Error analyzing journal entry:", error);
    if (import.meta.env.DEV)
      return aiOk(generateMockAnalysis(content, language));
    return aiUnavailable;
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

  const sysPrompt = await getSystemPromptForCurrentUser();
  const textResponse = await callLLM(
    prompt,
    0.5,
    512,
    0.95,
    undefined,
    language,
    signal,
    "extractObjectivesFromJournal",
    { content },
    sysPrompt,
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
    logger.error("Error extracting objectives:", error);
    return [];
  }
}
