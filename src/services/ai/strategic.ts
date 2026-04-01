import {
  safeParse,
  DivergentPathsArraySchema,
  NextStepsArraySchema,
} from "../../lib/aiSchemas";
import { callLLM } from "./callLLM";
import { logger } from '../../utils/logger';

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
    "generateDivergentPaths",
    { ideaTitle, ideaContent },
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
    logger.error("Error generating divergent paths:", error);
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
    "suggestNextSteps",
    { ideaTitle, ideaContent },
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
    logger.error("Error suggesting next steps:", error);
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
