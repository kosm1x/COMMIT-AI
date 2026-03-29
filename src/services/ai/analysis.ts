import {
  safeParse,
  CriticalAnalysisSchema,
  RelatedConceptsArraySchema,
} from "../../lib/aiSchemas";
import { callLLM } from "./callLLM";

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
    "generateCriticalAnalysis",
    { ideaTitle, ideaContent },
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
    "generateRelatedConcepts",
    { ideaTitle, ideaContent },
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
