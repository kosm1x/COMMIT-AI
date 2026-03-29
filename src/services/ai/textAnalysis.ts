/**
 * Text analysis utilities for idea similarity matching.
 * Provides keyword extraction, content similarity scoring, and fallback matching.
 */

import { STOPWORDS } from "./stopwords";

export interface IdeaConnection {
  ideaId: string;
  ideaTitle: string;
  connectionType: "similar" | "complementary" | "prerequisite" | "related";
  strength: number;
  reason: string;
}

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
export function findSimilarIdeasFallback(
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

    // PRIORITY 3: Content keyword similarity
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
