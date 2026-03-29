import {
  safeParse,
  SuggestedObjectivesArraySchema,
  SuggestedTasksArraySchema,
} from "../../lib/aiSchemas";
import { callLLM } from "./callLLM";

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
    "suggestObjectivesForGoal",
    { goalTitle, goalDescription },
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
    "suggestTasksForObjective",
    { objectiveTitle, objectiveDescription },
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
