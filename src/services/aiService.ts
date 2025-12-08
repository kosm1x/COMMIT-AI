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
  happy: 'bg-yellow-500',
  sad: 'bg-blue-500',
  angry: 'bg-red-500',
  anxious: 'bg-orange-500',
  calm: 'bg-green-500',
  excited: 'bg-pink-500',
  frustrated: 'bg-purple-500',
  hopeful: 'bg-teal-500',
  overwhelmed: 'bg-indigo-500',
  grateful: 'bg-emerald-500',
  determined: 'bg-cyan-500',
  confused: 'bg-gray-500',
};

/**
 * Helper function to call Groq API (OpenAI-compatible)
 * @param prompt - The prompt text to send to the API
 * @param temperature - Temperature parameter (0-2)
 * @param max_tokens - Maximum tokens to generate
 * @param top_p - Top-p sampling parameter
 * @param reasoning_effort - Optional reasoning effort for complex tasks ("default" | "low" | "medium" | "high")
 * @returns The text response from the API, or null if error
 */
async function callGroqAPI(
  prompt: string,
  temperature: number,
  max_tokens: number,
  top_p: number = 0.95,
  reasoning_effort?: 'default' | 'low' | 'medium' | 'high'
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return null;
  }

  try {
    const requestBody: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature: number;
      max_tokens: number;
      top_p: number;
      reasoning_effort?: string;
    } = {
      model: 'qwen/qwen3-32b',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens,
      top_p,
    };

    if (reasoning_effort) {
      requestBody.reasoning_effort = reasoning_effort;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return null;
  }
}

export async function analyzeJournalEntry(content: string): Promise<AnalysisResult> {
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

  const textResponse = await callGroqAPI(prompt, 0.7, 1024, 0.95, 'default');

  if (!textResponse) {
      return generateMockAnalysis(content);
    }

  try {
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedResult = JSON.parse(jsonMatch[0]);

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
        primary_emotion: parsedResult.primary_emotion || emotions[0]?.name || 'neutral',
      };
    }

    return generateMockAnalysis(content);
  } catch (error) {
    console.error('Error analyzing journal entry:', error);
    return generateMockAnalysis(content);
  }
}

function getEmotionColor(emotionName: string): string {
  const normalized = emotionName.toLowerCase();
  for (const [key, color] of Object.entries(emotionColors)) {
    if (normalized.includes(key)) {
      return color;
    }
  }
  return 'bg-gray-500';
}

function generateMockAnalysis(content: string): AnalysisResult {
  const commonEmotions: EmotionResult[] = [
    { name: 'Determined', intensity: 75, color: 'bg-cyan-500' },
    { name: 'Hopeful', intensity: 65, color: 'bg-teal-500' },
    { name: 'Focused', intensity: 80, color: 'bg-blue-500' },
  ];

  if (content.toLowerCase().includes('stress') || content.toLowerCase().includes('anxious')) {
    commonEmotions.push({ name: 'Anxious', intensity: 60, color: 'bg-orange-500' });
  }

  if (content.toLowerCase().includes('happy') || content.toLowerCase().includes('great')) {
    commonEmotions.push({ name: 'Happy', intensity: 85, color: 'bg-yellow-500' });
  }

  if (content.toLowerCase().includes('tired') || content.toLowerCase().includes('exhausted')) {
    commonEmotions.push({ name: 'Overwhelmed', intensity: 55, color: 'bg-indigo-500' });
  }

  const patterns = [
    'Consistent focus on personal development and growth',
    'Balancing multiple priorities and commitments',
    'Strong motivation toward achieving goals',
  ];

  if (content.toLowerCase().includes('work')) {
    patterns.push('Work-related themes and professional development');
  }

  const copingStrategies = [
    'Break down large goals into smaller, manageable daily actions',
    'Schedule regular breaks to maintain energy and focus',
    'Practice mindfulness or deep breathing when feeling overwhelmed',
    'Celebrate small wins to maintain motivation',
  ];

  const selectedEmotions = commonEmotions.slice(0, 4);
  return {
    emotions: selectedEmotions,
    patterns: patterns.slice(0, 3),
    coping_strategies: copingStrategies.slice(0, 3),
    primary_emotion: selectedEmotions[0]?.name || 'neutral',
  };
}

export async function extractObjectivesFromJournal(content: string): Promise<string[]> {
  const prompt = `Extract potential goals or objectives from this journal entry. Return a JSON array of strings, each representing a goal or objective the person might want to pursue. If no clear goals are mentioned, return an empty array.

Journal Entry:
${content}

Return ONLY a JSON array like: ["goal1", "goal2", "goal3"]`;

  const textResponse = await callGroqAPI(prompt, 0.5, 512, 0.95);

  if (!textResponse) {
      return [];
    }

  try {
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    console.error('Error extracting objectives:', error);
    return [];
  }
}

interface MindMapResult {
  mermaidSyntax: string;
  title: string;
}

export async function generateMindMap(problemStatement: string, context?: string): Promise<MindMapResult> {
  const contextPrompt = context 
    ? `\n\nPrevious Context (from earlier mind maps in this exploration):
${context}

Use this context to ensure continuity and build upon previous insights. The new mind map should expand on the selected topic while maintaining awareness of the broader exploration context.`
    : '';

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
${context ? '6. Builds upon and expands the context provided from previous explorations' : ''}

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

  const textResponse = await callGroqAPI(prompt, 0.7, 2048, 0.95, 'default');

  if (!textResponse) {
    return generateMockMindMap(problemStatement, context);
  }

  try {
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedResult = JSON.parse(jsonMatch[0]);
      return {
        title: parsedResult.title || 'Mind Map',
        mermaidSyntax: parsedResult.mermaidSyntax || '',
      };
    }

    return generateMockMindMap(problemStatement, context);
  } catch (error) {
    console.error('Error generating mind map:', error);
    return generateMockMindMap(problemStatement, context);
  }
}

function generateMockMindMap(problemStatement: string, _context?: string): MindMapResult {
  const shortProblem = problemStatement.slice(0, 30) + (problemStatement.length > 30 ? '...' : '');

  return {
    title: 'Problem Breakdown',
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

export async function completeIdea(initialInput: string): Promise<IdeaCompletionResult> {
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

  const textResponse = await callGroqAPI(prompt, 0.8, 2048, 0.95);

  if (!textResponse) {
      return generateMockIdeaCompletion(initialInput);
    }

  try {
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedResult = JSON.parse(jsonMatch[0]);
      return {
        title: parsedResult.title || 'New Idea',
        expandedContent: parsedResult.expandedContent || initialInput,
        category: parsedResult.category || 'general',
        tags: parsedResult.tags || [],
        suggestions: parsedResult.suggestions || [],
      };
    }

    return generateMockIdeaCompletion(initialInput);
  } catch (error) {
    console.error('Error completing idea:', error);
    return generateMockIdeaCompletion(initialInput);
  }
}

function generateMockIdeaCompletion(initialInput: string): IdeaCompletionResult {
  return {
    title: initialInput.slice(0, 50) + (initialInput.length > 50 ? '...' : ''),
    expandedContent: `${initialInput}\n\nThis is a promising concept that could be developed further. Consider breaking it down into smaller, actionable steps. Think about the resources you'll need, potential challenges, and how you can measure success.\n\nTo move forward, start by researching similar approaches and identifying key stakeholders or collaborators who could help bring this idea to life.`,
    category: 'general',
    tags: ['brainstorming', 'new-idea', 'development'],
    suggestions: [
      'Research existing solutions in this area',
      'Create a detailed action plan with milestones',
      'Identify potential collaborators or resources',
      'Start with a small prototype or proof of concept',
    ],
  };
}

interface IdeaConnection {
  ideaId: string;
  ideaTitle: string;
  connectionType: 'similar' | 'complementary' | 'prerequisite' | 'related';
  strength: number;
  reason: string;
}

export async function findIdeaConnections(
  currentIdea: string,
  existingIdeas: { id: string; title: string; content: string; tags?: string[] }[],
  currentIdeaMeta?: { title: string; tags?: string[] }
): Promise<IdeaConnection[]> {
  if (existingIdeas.length === 0) {
    console.log('[findIdeaConnections] No existing ideas to compare');
    return [];
  }

  console.log(`[findIdeaConnections] Analyzing connections for idea with ${existingIdeas.length} existing ideas`);

  // Extract current idea title and content for better matching
  const currentLines = currentIdea.split('\n');
  const currentTitle = currentLines[0] || '';
  const currentContent = currentIdea.slice(currentTitle.length).trim();

  const ideasContext = existingIdeas
    .map((idea, idx) => {
      const tagsStr = idea.tags && idea.tags.length > 0 ? `\nTags: ${idea.tags.join(', ')}` : '';
      return `${idx + 1}. [ID: ${idea.id}] ${idea.title}${tagsStr}\n${(idea.content || '').slice(0, 300)}`;
    })
    .join('\n\n');

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
${currentIdeaMeta?.tags && currentIdeaMeta.tags.length > 0 ? `Tags: ${currentIdeaMeta.tags.join(', ')}` : ''}

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

  const textResponse = await callGroqAPI(prompt, 0.5, 2048, 0.95, 'default');

  if (!textResponse) {
    console.warn('[findIdeaConnections] API call failed, using fallback similarity check');
    return findSimilarIdeasFallback(currentIdea, currentTitle, currentContent, existingIdeas);
  }

  console.log('[findIdeaConnections] API response received, length:', textResponse.length);

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
      const connections = JSON.parse(jsonMatch[0]);
      console.log('[findIdeaConnections] Parsed connections:', connections.length);
      
      interface ParsedConnection {
        ideaId: string;
        connectionType?: 'similar' | 'complementary' | 'prerequisite' | 'related';
        strength?: number;
        reason?: string;
      }
      
      // Ensure connections is an array
      const connectionsArray = Array.isArray(connections) ? connections : [connections];
      
      const MIN_STRENGTH_THRESHOLD = 70;
      
      const filteredConnections = connectionsArray
        .map((conn: ParsedConnection) => {
          const matchedIdea = existingIdeas.find((idea) => idea.id === conn.ideaId);
          if (!matchedIdea) {
            console.warn(`[findIdeaConnections] Connection references unknown idea ID: ${conn.ideaId}`);
            return null;
          }
          
          const strength = Math.min(100, Math.max(1, conn.strength || 50));
          
          return {
            ideaId: conn.ideaId,
            ideaTitle: matchedIdea.title,
            connectionType: conn.connectionType || 'related',
            strength,
            reason: conn.reason || 'Related concept',
          };
        })
        .filter((conn): conn is IdeaConnection => conn !== null && conn.strength >= MIN_STRENGTH_THRESHOLD);
      
      console.log(`[findIdeaConnections] Filtered to ${filteredConnections.length} connections with strength >= ${MIN_STRENGTH_THRESHOLD}`);
      
      // If no AI connections found, use strict fallback
      if (filteredConnections.length === 0) {
        console.log('[findIdeaConnections] No AI connections found, using strict fallback similarity check');
        return findSimilarIdeasFallback(currentIdea, currentTitle, currentContent, existingIdeas, currentIdeaMeta);
      }
      
      return filteredConnections;
    } else {
      console.warn('[findIdeaConnections] Could not extract JSON from response, using fallback');
      return findSimilarIdeasFallback(currentIdea, currentTitle, currentContent, existingIdeas);
    }
  } catch (error) {
    console.error('[findIdeaConnections] Error parsing connections:', error);
    console.error('[findIdeaConnections] Response was:', textResponse.substring(0, 500));
    return findSimilarIdeasFallback(currentIdea, currentTitle, currentContent, existingIdeas);
  }
}

// Strict fallback function prioritizing title similarity, then tags
function findSimilarIdeasFallback(
  _currentIdea: string,
  currentTitle: string,
  _currentContent: string,
  existingIdeas: { id: string; title: string; content: string; tags?: string[] }[],
  currentIdeaMeta?: { title: string; tags?: string[] }
): IdeaConnection[] {
  const connections: IdeaConnection[] = [];
  const currentTitleLower = currentTitle.toLowerCase().trim();
  const currentTags = new Set((currentIdeaMeta?.tags || []).map(t => t.toLowerCase().trim()));
  
  // Normalize title for comparison (remove special chars, lowercase)
  const normalizeTitle = (title: string): string => {
    return title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const normalizedCurrentTitle = normalizeTitle(currentTitle);
  
  existingIdeas.forEach(idea => {
    const ideaTitleLower = idea.title.toLowerCase().trim();
    const normalizedIdeaTitle = normalizeTitle(idea.title);
    const ideaTags = new Set((idea.tags || []).map(t => t.toLowerCase().trim()));
    
    // PRIORITY 1: Exact or near-exact title match
    if (currentTitleLower === ideaTitleLower) {
      connections.push({
        ideaId: idea.id,
        ideaTitle: idea.title,
        connectionType: 'similar',
        strength: 95,
        reason: 'Identical title',
      });
      return;
    }
    
    // Check for very similar normalized titles (high similarity threshold)
    const currentTitleWords = normalizedCurrentTitle.split(/\s+/).filter(w => w.length >= 2);
    const ideaTitleWords = normalizedIdeaTitle.split(/\s+/).filter(w => w.length >= 2);
    
    if (currentTitleWords.length > 0 && ideaTitleWords.length > 0) {
      const commonWords = currentTitleWords.filter(w => ideaTitleWords.includes(w));
      const similarityRatio = commonWords.length / Math.max(currentTitleWords.length, ideaTitleWords.length);
      
      // Require at least 60% word overlap for title similarity
      if (similarityRatio >= 0.6 && commonWords.length >= 2) {
        connections.push({
          ideaId: idea.id,
          ideaTitle: idea.title,
          connectionType: 'similar',
          strength: Math.min(90, 70 + Math.round(similarityRatio * 20)),
          reason: `Very similar title (${commonWords.length} common words)`,
        });
        return;
      }
      
      // Moderate title similarity (50% overlap, 2+ words)
      if (similarityRatio >= 0.5 && commonWords.length >= 2) {
        connections.push({
          ideaId: idea.id,
          ideaTitle: idea.title,
          connectionType: 'similar',
          strength: 75,
          reason: `Similar title (${commonWords.length} common words)`,
        });
        return;
      }
    }
    
    // PRIORITY 2: Tag overlap (only if we have tags)
    if (currentTags.size > 0 && ideaTags.size > 0) {
      const commonTags = Array.from(currentTags).filter(t => ideaTags.has(t));
      
      // Require at least 2 shared tags or 50%+ tag overlap
      const tagOverlapRatio = commonTags.length / Math.max(currentTags.size, ideaTags.size);
      
      if (commonTags.length >= 2 || (tagOverlapRatio >= 0.5 && commonTags.length >= 1)) {
        connections.push({
          ideaId: idea.id,
          ideaTitle: idea.title,
          connectionType: 'related',
          strength: Math.min(85, 70 + (commonTags.length * 5)),
          reason: `Shared tags: ${commonTags.join(', ')}`,
        });
        return;
      }
    }
    
    // PRIORITY 3: Substring match in titles (only for substantial matches)
    if (normalizedCurrentTitle.length >= 8 && normalizedIdeaTitle.length >= 8) {
      const longerTitle = normalizedCurrentTitle.length > normalizedIdeaTitle.length 
        ? normalizedCurrentTitle 
        : normalizedIdeaTitle;
      const shorterTitle = normalizedCurrentTitle.length > normalizedIdeaTitle.length 
        ? normalizedIdeaTitle 
        : normalizedCurrentTitle;
      
      // Require at least 8 characters overlap
      if (shorterTitle.length >= 8 && longerTitle.includes(shorterTitle)) {
        connections.push({
          ideaId: idea.id,
          ideaTitle: idea.title,
          connectionType: 'similar',
          strength: 72,
          reason: 'Title contains substantial matching text',
        });
        return;
      }
    }
  });
  
  // Sort by strength (descending) and limit to top 5 (stricter)
  const sortedConnections = connections
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);
  
  console.log(`[findSimilarIdeasFallback] Found ${sortedConnections.length} close connections via strict fallback`);
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
  ideaContent: string
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

  const textResponse = await callGroqAPI(prompt, 0.9, 1536, 0.95, 'default');

  if (!textResponse) {
      return generateMockDivergentPaths(ideaTitle);
    }

  try {
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return generateMockDivergentPaths(ideaTitle);
  } catch (error) {
    console.error('Error generating divergent paths:', error);
    return generateMockDivergentPaths(ideaTitle);
  }
}

function generateMockDivergentPaths(_ideaTitle: string): DivergentPath[] {
  return [
    {
      title: 'Rapid Prototype Approach',
      description: 'Build a minimal version quickly to test core assumptions',
      approach: 'Focus on creating a basic working prototype within 2-4 weeks. Strip away all non-essential features and test the fundamental concept with real users.',
      potentialOutcome: 'Fast validation of whether the core idea resonates, allowing for quick pivots if needed',
    },
    {
      title: 'Research-First Strategy',
      description: 'Deep dive into existing solutions and user needs before building',
      approach: 'Spend 1-2 months conducting thorough market research, user interviews, and competitive analysis. Map out the landscape before committing to an approach.',
      potentialOutcome: 'Well-informed decision making with reduced risk of building something unwanted',
    },
    {
      title: 'Community-Driven Development',
      description: 'Build in public with early adopters shaping the direction',
      approach: 'Share your concept early with a small community of interested users. Co-create the solution by incorporating their feedback and ideas at every stage.',
      potentialOutcome: 'Built-in user base and product-market fit through collaborative development',
    },
  ];
}

interface NextStep {
  step: string;
  description: string;
  timeEstimate: string;
  priority: 'high' | 'medium' | 'low';
}

export async function suggestNextSteps(
  ideaTitle: string,
  ideaContent: string
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

  const textResponse = await callGroqAPI(prompt, 0.7, 1024, 0.95);

  if (!textResponse) {
      return generateMockNextSteps();
    }

  try {
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return generateMockNextSteps();
  } catch (error) {
    console.error('Error suggesting next steps:', error);
    return generateMockNextSteps();
  }
}

function generateMockNextSteps(): NextStep[] {
  return [
    {
      step: 'Define core requirements and constraints',
      description: 'Clarify what success looks like and identify any limitations or boundaries',
      timeEstimate: '2-3 hours',
      priority: 'high',
    },
    {
      step: 'Research existing solutions',
      description: 'Look for similar ideas or approaches to learn from successes and failures',
      timeEstimate: '1 day',
      priority: 'high',
    },
    {
      step: 'Create a simple action plan',
      description: 'Break down the idea into phases with clear milestones',
      timeEstimate: '3-4 hours',
      priority: 'medium',
    },
    {
      step: 'Identify potential collaborators',
      description: 'Find people with complementary skills who could help or provide feedback',
      timeEstimate: '1-2 days',
      priority: 'medium',
    },
  ];
}

interface CriticalAnalysis {
  strengths: string[];
  challenges: string[];
  assumptions: string[];
  alternativePerspectives: string[];
}

export async function generateCriticalAnalysis(
  ideaTitle: string,
  ideaContent: string
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

  const textResponse = await callGroqAPI(prompt, 0.6, 1024, 0.95, 'default');

  if (!textResponse) {
      return generateMockCriticalAnalysis();
    }

  try {
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return generateMockCriticalAnalysis();
  } catch (error) {
    console.error('Error generating critical analysis:', error);
    return generateMockCriticalAnalysis();
  }
}

function generateMockCriticalAnalysis(): CriticalAnalysis {
  return {
    strengths: [
      'Addresses a clear need or problem area',
      'Can be started with existing resources',
      'Has potential for iterative improvement',
    ],
    challenges: [
      'May require significant time investment',
      'Success depends on factors outside your control',
      'Competition or similar solutions might exist',
    ],
    assumptions: [
      'Target users will value this solution',
      'Required resources will be accessible',
      'Timeline is realistic given constraints',
    ],
    alternativePerspectives: [
      'Consider starting smaller and scaling up based on feedback',
      'Could partner with others rather than building alone',
    ],
  };
}

interface RelatedConcept {
  concept: string;
  description: string;
  relevance: string;
  resources: string[];
}

export async function generateRelatedConcepts(
  ideaTitle: string,
  ideaContent: string
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

  const textResponse = await callGroqAPI(prompt, 0.7, 1536, 0.95, 'default');

  if (!textResponse) {
      return generateMockRelatedConcepts();
    }

  try {
    const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return generateMockRelatedConcepts();
  } catch (error) {
    console.error('Error generating related concepts:', error);
    return generateMockRelatedConcepts();
  }
}

function generateMockRelatedConcepts(): RelatedConcept[] {
  return [
    {
      concept: 'Lean Startup Methodology',
      description: 'Build-measure-learn approach to developing products',
      relevance: 'Helps validate assumptions quickly through rapid experimentation',
      resources: ['The Lean Startup by Eric Ries', 'Running Lean by Ash Maurya'],
    },
    {
      concept: 'Design Thinking',
      description: 'Human-centered approach to innovation and problem-solving',
      relevance: 'Ensures your solution addresses real user needs',
      resources: ['IDEO Design Thinking resources', 'Stanford d.school methodology'],
    },
    {
      concept: 'Systems Thinking',
      description: 'Understanding how different parts interact as a whole',
      relevance: 'Reveals hidden connections and unintended consequences',
      resources: ['Thinking in Systems by Donella Meadows'],
    },
  ];
}

// Transform or collaborate on selected text within an idea
export async function transformIdeaText(
  mode: 'enhance' | 'complete' | 'shorten' | 'summarize' | 'cocreate',
  selectedText: string,
  context: { 
    title: string; 
    content: string;
    cursorPosition?: number;
    fullContext?: string;
  }
): Promise<string> {
  const prompts: Record<typeof mode, string> = {
    enhance: `Improve clarity, style, and impact of the following text. Keep the author's intent and voice. Return only the rewritten text, nothing else.`,
    
    complete: `Continue writing naturally from where the text ends. Match the tone and style. Keep it focused and purposeful. Return ONLY the continuation (do not repeat the existing text).`,
    
    shorten: `Condense the following text while preserving key meaning and tone. Return only the shortened version.`,
    
    summarize: `Create a concise summary of the entire text in 2-4 sentences, capturing the essential points. Return only the summary.`,
    
    cocreate: `Based on the last paragraph provided, add 1-2 thoughtful new paragraphs that naturally build on these ideas. Keep the same voice and style. Return ONLY the new content (do not repeat the existing paragraph).`,
  };

  let prompt = '';
  
  if (mode === 'complete') {
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
  } else if (mode === 'cocreate') {
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
  const textResponse = await callGroqAPI(prompt, 0.5, 600, 0.95);
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
  cleaned = cleaned.replace(/<think[\s\S]*?(?:<\/think>|$)/gi, '');
  cleaned = cleaned.replace(/<thinking[\s\S]*?(?:<\/thinking>|$)/gi, '');
  
  // Remove any remaining opening tags that might be left
  cleaned = cleaned.replace(/<\/?think(?:ing)?>/gi, '');
  
  // Remove reasoning sections (common patterns)
  cleaned = cleaned.replace(/^\s*(?:Thinking|Reasoning|Analysis|Approach|Strategy|Plan):\s*[\s\S]*?(?=\n\n|$)/im, '');
  
  // Remove "Here's the..." or "Here is the..." prefixes
  cleaned = cleaned.replace(/^(?:Here's|Here is|This is) (?:the|a) [\w\s]+:?\s*/i, '');
  
  // Remove quoted output (if the entire result is wrapped in quotes)
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Remove code fences if the entire output is wrapped
  cleaned = cleaned.replace(/^```[\w]*\s*([\s\S]*?)\s*```$/g, '$1');
  
  // Remove "Output:" or "Result:" prefixes
  cleaned = cleaned.replace(/^(?:Output|Result|Final (?:output|result|text)):\s*/im, '');
  
  // If we still see fragments of thinking tags at the start, extract everything after them
  const afterThinking = cleaned.match(/(?:<\/think(?:ing)?>|think(?:ing)?>)\s*([\s\S]*)/i);
  if (afterThinking && afterThinking[1]) {
    cleaned = afterThinking[1].trim();
  }
  
  return cleaned.trim() || text.trim(); // Fallback to original if we stripped everything
}
