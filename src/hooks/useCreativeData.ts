import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  getStartOfMonth,
  getEndOfMonth,
  getDaysInMonth,
} from "../utils/trackingStats";

export interface DayActivity {
  date: Date;
  ideas: number;
  mindMaps: number;
  timeSpent: number; // in minutes
}

export interface CreativeStats {
  totalIdeas: number;
  totalMindMaps: number;
  totalTimeSpent: number;
  ideasThisPeriod: number;
  mindMapsThisPeriod: number;
  timeSpentThisPeriod: number;
}

export interface EmotionData {
  date: Date;
  emotion: string;
  intensity: number;
}

export interface WordFrequency {
  word: string;
  count: number;
}

export function useCreativeData(
  selectedDate: Date,
  viewMode: "daily" | "weekly" | "monthly",
) {
  const { user } = useAuth();
  const [stats, setStats] = useState<CreativeStats>({
    totalIdeas: 0,
    totalMindMaps: 0,
    totalTimeSpent: 0,
    ideasThisPeriod: 0,
    mindMapsThisPeriod: 0,
    timeSpentThisPeriod: 0,
  });
  const [dailyActivity, setDailyActivity] = useState<DayActivity[]>([]);
  const [emotionData, setEmotionData] = useState<EmotionData[]>([]);
  const [periodEmotionData, setPeriodEmotionData] = useState<EmotionData[]>([]);
  const [wordFrequencies, setWordFrequencies] = useState<WordFrequency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedDate, viewMode]);

  // Track active time (Shared logic)
  useEffect(() => {
    if (!user) return;

    const lastUpdateKey = `last_update_${user.id}`;
    const lastActivityKey = `last_activity_${user.id}`;
    const isActiveKey = `is_active_${user.id}`;

    let isActive = true; // Track if user is actively using the site
    let lastActivityTime = Date.now();
    let lastUpdateTime = Date.now();
    let accumulatedSeconds = 0; // Track seconds accumulated in current minute

    // Initialize
    const now = Date.now();
    const storedLastUpdate = localStorage.getItem(lastUpdateKey);
    const storedLastActivity = localStorage.getItem(lastActivityKey);

    // If last activity was more than 2 minutes ago, reset (user was away)
    if (storedLastActivity) {
      const timeSinceActivity = (now - parseInt(storedLastActivity)) / 1000; // in seconds
      if (timeSinceActivity > 120) {
        // 2 minutes
        // User was away, don't count that time
        lastUpdateTime = now;
        lastActivityTime = now;
      } else {
        lastUpdateTime = storedLastUpdate ? parseInt(storedLastUpdate) : now;
        lastActivityTime = parseInt(storedLastActivity);
      }
    } else {
      lastUpdateTime = now;
      lastActivityTime = now;
    }

    localStorage.setItem(lastUpdateKey, lastUpdateTime.toString());
    localStorage.setItem(lastActivityKey, lastActivityTime.toString());
    localStorage.setItem(isActiveKey, "true");

    // Track user activity (mouse, keyboard, scroll, touch)
    const updateActivity = () => {
      if (!document.hidden && isActive) {
        lastActivityTime = Date.now();
        localStorage.setItem(lastActivityKey, lastActivityTime.toString());
      }
    };

    // Activity event listeners
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];
    activityEvents.forEach((event) => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    const updateTimeSpent = () => {
      if (document.hidden) {
        // Tab is hidden - save accumulated time and stop tracking
        if (accumulatedSeconds > 0) {
          saveAccumulatedTime();
        }
        isActive = false;
        localStorage.setItem(isActiveKey, "false");
        return;
      }

      const now = Date.now();
      const timeSinceLastActivity = (now - lastActivityTime) / 1000; // in seconds

      // If user hasn't been active for 30 seconds, consider them inactive
      if (timeSinceLastActivity > 30) {
        if (isActive) {
          // Just became inactive - save accumulated time
          if (accumulatedSeconds > 0) {
            saveAccumulatedTime();
          }
          isActive = false;
          localStorage.setItem(isActiveKey, "false");
        }
        lastUpdateTime = now;
        return;
      }

      // User is active
      if (!isActive) {
        // Just became active - reset update time
        isActive = true;
        lastUpdateTime = now;
        localStorage.setItem(isActiveKey, "true");
      }

      // Calculate elapsed time since last update
      const elapsedSeconds = (now - lastUpdateTime) / 1000;

      // Cap at 30 seconds to prevent huge jumps
      const cappedElapsed = Math.min(elapsedSeconds, 30);

      if (cappedElapsed > 0) {
        accumulatedSeconds += cappedElapsed;
        lastUpdateTime = now;
        localStorage.setItem(lastUpdateKey, now.toString());

        // Save every 15 seconds of accumulated time
        if (accumulatedSeconds >= 15) {
          saveAccumulatedTime();
        }
      }
    };

    const saveAccumulatedTime = () => {
      if (accumulatedSeconds > 0) {
        const minutesToAdd = Math.floor(accumulatedSeconds / 60);
        if (minutesToAdd > 0) {
          const today = new Date().toISOString().split("T")[0];
          const timeKey = `time_spent_${user.id}_${today}`;
          const existing = parseInt(localStorage.getItem(timeKey) || "0");
          localStorage.setItem(timeKey, (existing + minutesToAdd).toString());

          // Stats will reload on next component render/refresh
        }
        accumulatedSeconds = accumulatedSeconds % 60; // Keep remaining seconds
      }
    };

    // Update every 10 seconds for more accurate tracking
    const interval = setInterval(updateTimeSpent, 10000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - save accumulated time
        if (accumulatedSeconds > 0) {
          saveAccumulatedTime();
        }
        isActive = false;
        localStorage.setItem(isActiveKey, "false");
      } else {
        // Tab is visible again - reset activity tracking
        lastActivityTime = Date.now();
        lastUpdateTime = Date.now();
        localStorage.setItem(lastActivityKey, lastActivityTime.toString());
        localStorage.setItem(lastUpdateKey, lastUpdateTime.toString());
        isActive = true;
        localStorage.setItem(isActiveKey, "true");
      }
    };

    // Track when window is about to close
    const handleBeforeUnload = () => {
      if (accumulatedSeconds > 0) {
        saveAccumulatedTime();
      }
    };

    // Track page focus/blur
    const handleFocus = () => {
      lastActivityTime = Date.now();
      lastUpdateTime = Date.now();
      localStorage.setItem(lastActivityKey, lastActivityTime.toString());
      localStorage.setItem(lastUpdateKey, lastUpdateTime.toString());
      isActive = true;
      localStorage.setItem(isActiveKey, "true");
    };

    const handleBlur = () => {
      if (accumulatedSeconds > 0) {
        saveAccumulatedTime();
      }
      isActive = false;
      localStorage.setItem(isActiveKey, "false");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      activityEvents.forEach((event) => {
        document.removeEventListener(event, updateActivity);
      });
      if (accumulatedSeconds > 0) {
        saveAccumulatedTime();
      }
    };
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCreativeStats(), loadJournalData()]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCreativeStats = async () => {
    const startDate =
      viewMode === "daily"
        ? new Date(selectedDate)
        : viewMode === "weekly"
          ? new Date(selectedDate)
          : getStartOfMonth(selectedDate);

    const endDate =
      viewMode === "daily"
        ? new Date(selectedDate)
        : viewMode === "weekly"
          ? new Date(selectedDate)
          : getEndOfMonth(selectedDate);

    if (viewMode === "weekly") {
      startDate.setDate(selectedDate.getDate() - selectedDate.getDay());
      endDate.setDate(startDate.getDate() + 6);
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Optimization: Use count queries for totals (no data transfer, just counts)
    // And only fetch created_at for period data (needed for daily bucketing)
    const [totalIdeasResult, totalMindMapsResult, ideasResult, mindMapsResult] =
      await Promise.all([
        // Count-only queries for totals (much faster, no data transfer)
        supabase
          .from("ideas")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id),
        supabase
          .from("mind_maps")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id),
        // Period data - only fetch created_at for bucketing
        supabase
          .from("ideas")
          .select("created_at")
          .eq("user_id", user!.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        supabase
          .from("mind_maps")
          .select("created_at")
          .eq("user_id", user!.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
      ]);

    const totalIdeas = totalIdeasResult.count ?? 0;
    const totalMindMaps = totalMindMapsResult.count ?? 0;
    const periodIdeas = ideasResult.data || [];
    const periodMindMaps = mindMapsResult.data || [];

    // Pre-bucket period data by date key to avoid O(n * days) filtering
    const ideasByDate = new Map<string, number>();
    const mindMapsByDate = new Map<string, number>();

    for (const idea of periodIdeas) {
      const dateKey = idea.created_at.split("T")[0];
      ideasByDate.set(dateKey, (ideasByDate.get(dateKey) || 0) + 1);
    }

    for (const map of periodMindMaps) {
      const dateKey = map.created_at.split("T")[0];
      mindMapsByDate.set(dateKey, (mindMapsByDate.get(dateKey) || 0) + 1);
    }

    const days: DayActivity[] = [];
    const daysCount =
      viewMode === "daily"
        ? 1
        : viewMode === "weekly"
          ? 7
          : getDaysInMonth(selectedDate);

    for (let i = 0; i < daysCount; i++) {
      const currentDay = new Date(startDate);
      if (viewMode === "weekly") {
        currentDay.setDate(startDate.getDate() + i);
      } else if (viewMode === "monthly") {
        currentDay.setDate(i + 1);
      }
      currentDay.setHours(0, 0, 0, 0);

      const dayKey = currentDay.toISOString().split("T")[0];
      const dayTime = parseInt(
        localStorage.getItem(`time_spent_${user!.id}_${dayKey}`) || "0",
      );

      // O(1) lookup instead of O(n) filtering
      days.push({
        date: currentDay,
        ideas: ideasByDate.get(dayKey) || 0,
        mindMaps: mindMapsByDate.get(dayKey) || 0,
        timeSpent: dayTime,
      });
    }

    setDailyActivity(days);

    let totalTime = 0;
    for (let i = 0; i < 365; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = `time_spent_${user!.id}_${date.toISOString().split("T")[0]}`;
      const dayTime = parseInt(localStorage.getItem(dateKey) || "0");
      // Cap daily time at 24 hours (1440 minutes) to prevent obviously incorrect values
      totalTime += Math.min(dayTime, 1440);
    }

    // Calculate period time, capping each day at 24 hours
    const periodTime = days.reduce(
      (sum, d) => sum + Math.min(d.timeSpent, 1440),
      0,
    );

    setStats({
      totalIdeas,
      totalMindMaps,
      totalTimeSpent: totalTime,
      ideasThisPeriod: periodIdeas.length,
      mindMapsThisPeriod: periodMindMaps.length,
      timeSpentThisPeriod: periodTime,
    });
  };

  const loadJournalData = async () => {
    try {
      // Compute period dates first (needed for both emotion filtering and word frequency)
      const startDate =
        viewMode === "daily"
          ? new Date(selectedDate)
          : viewMode === "weekly"
            ? new Date(selectedDate)
            : getStartOfMonth(selectedDate);

      const endDate =
        viewMode === "daily"
          ? new Date(selectedDate)
          : viewMode === "weekly"
            ? new Date(selectedDate)
            : getEndOfMonth(selectedDate);

      if (viewMode === "weekly") {
        startDate.setDate(selectedDate.getDate() - selectedDate.getDay());
        endDate.setDate(startDate.getDate() + 6);
      }
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Load journal entries from the last 3 months for emotion tracking (no content needed)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);

      const [entriesResult, periodEntriesResult] = await Promise.all([
        // Emotion tracking: 3 months, no content (only id/date needed to join with ai_analysis)
        supabase
          .from("journal_entries")
          .select("id, entry_date, created_at")
          .eq("user_id", user!.id)
          .gte("entry_date", threeMonthsAgo.toISOString().split("T")[0])
          .order("entry_date", { ascending: false }),
        // Word frequency: current period only, with content
        supabase
          .from("journal_entries")
          .select("id, content")
          .eq("user_id", user!.id)
          .gte("entry_date", startDate.toISOString().split("T")[0])
          .lte("entry_date", endDate.toISOString().split("T")[0]),
      ]);

      const allEntries = entriesResult.data;
      const periodEntries = periodEntriesResult.data;

      if (!allEntries || allEntries.length === 0) {
        setEmotionData([]);
        setPeriodEmotionData([]);
        setWordFrequencies([]);
        return;
      }

      const allEntryIds = allEntries.map((e) => e.id);
      const { data: allAnalyses } = await supabase
        .from("ai_analysis")
        .select("entry_id, emotions, analyzed_at")
        .eq("user_id", user!.id)
        .in("entry_id", allEntryIds);

      const allEmotions: EmotionData[] = [];
      if (allAnalyses) {
        allAnalyses.forEach((analysis) => {
          const entry = allEntries.find((e) => e.id === analysis.entry_id);
          if (entry && analysis.emotions && Array.isArray(analysis.emotions)) {
            (
              analysis.emotions as Array<{ name: string; intensity: number }>
            ).forEach((emotion) => {
              allEmotions.push({
                date: new Date(entry.entry_date),
                emotion: emotion.name,
                intensity: emotion.intensity || 50,
              });
            });
          }
        });
      }

      const periodEmotions = allEmotions.filter((e) => {
        const emotionDate = new Date(e.date);
        emotionDate.setHours(0, 0, 0, 0);
        return emotionDate >= startDate && emotionDate <= endDate;
      });

      setEmotionData(allEmotions);
      setPeriodEmotionData(periodEmotions);

      const wordMap = new Map<string, number>();
      // Stop words in multiple languages (English, Spanish, and common words)
      const stopWords = new Set([
        // English
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
        "up",
        "about",
        "into",
        "through",
        "during",
        "including",
        "against",
        "among",
        "throughout",
        "despite",
        "towards",
        "upon",
        "concerning",
        "i",
        "me",
        "my",
        "myself",
        "we",
        "our",
        "ours",
        "ourselves",
        "you",
        "your",
        "yours",
        "yourself",
        "yourselves",
        "he",
        "him",
        "his",
        "himself",
        "she",
        "her",
        "hers",
        "herself",
        "it",
        "its",
        "itself",
        "they",
        "them",
        "their",
        "theirs",
        "themselves",
        "what",
        "which",
        "who",
        "whom",
        "this",
        "that",
        "these",
        "those",
        "am",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "have",
        "has",
        "had",
        "having",
        "do",
        "does",
        "did",
        "doing",
        "will",
        "would",
        "should",
        "could",
        "may",
        "might",
        "must",
        "can",
        "cannot",
        // Spanish
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
        "de",
        "a",
        "para",
        "por",
        "con",
        "sin",
        "sobre",
        "entre",
        "hasta",
        "desde",
        "durante",
        "mediante",
        "yo",
        "me",
        "mi",
        "mío",
        "mía",
        "míos",
        "mías",
        "nosotros",
        "nosotras",
        "nuestro",
        "nuestra",
        "tú",
        "te",
        "ti",
        "tu",
        "tuyo",
        "tuya",
        "tuyos",
        "tuyas",
        "él",
        "ella",
        "ello",
        "le",
        "lo",
        "la",
        "les",
        "los",
        "su",
        "suyo",
        "suyos",
        "suyas",
        "ese",
        "esa",
        "eso",
        "esos",
        "esas",
        "este",
        "esta",
        "esto",
        "estos",
        "estas",
        "aquel",
        "aquella",
        "aquello",
        "aquellos",
        "aquellas",
        "soy",
        "eres",
        "es",
        "somos",
        "sois",
        "son",
        "era",
        "eras",
        "éramos",
        "erais",
        "eran",
        "fui",
        "fuiste",
        "fue",
        "fuimos",
        "fuisteis",
        "fueron",
        "ser",
        "estar",
        "tener",
        "haber",
        "hacer",
        "poder",
        "deber",
        "querer",
        "saber",
        "decir",
        "ir",
        "venir",
        "ver",
        "dar",
      ]);

      (periodEntries || []).forEach((entry) => {
        if (entry.content) {
          // Use Unicode-aware regex to preserve accented characters
          // \p{L} matches any Unicode letter, \p{N} matches any Unicode number
          // This preserves Spanish, Chinese, and other accented characters
          const words = entry.content
            .toLowerCase()
            // Remove punctuation but preserve accented letters and numbers
            .replace(/[^\p{L}\p{N}\s]/gu, " ")
            .split(/\s+/)
            .filter((word: string) => word.length > 3 && !stopWords.has(word));

          words.forEach((word: string) => {
            wordMap.set(word, (wordMap.get(word) || 0) + 1);
          });
        }
      });

      const sortedWords = Array.from(wordMap.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

      setWordFrequencies(sortedWords);
    } catch (error) {
      console.error("Error loading journal data:", error);
    }
  };

  return {
    stats,
    dailyActivity,
    emotionData,
    periodEmotionData,
    wordFrequencies,
    loading,
  };
}
