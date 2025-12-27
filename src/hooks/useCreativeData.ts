import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getStartOfMonth, getEndOfMonth, getDaysInMonth } from '../utils/trackingStats';

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

export function useCreativeData(selectedDate: Date, viewMode: 'daily' | 'weekly' | 'monthly') {
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

    const startTime = Date.now();
    const sessionKey = `session_start_${user.id}`;
    const lastUpdateKey = `last_update_${user.id}`;
    
    // Reset lastUpdate when component mounts to prevent huge jumps from old sessions
    const lastUpdateValue = localStorage.getItem(lastUpdateKey);
    const now = Date.now();
    
    // If lastUpdate exists and is more than 5 minutes old, reset it (likely from a previous session)
    if (lastUpdateValue) {
      const lastUpdateTime = parseInt(lastUpdateValue);
      const timeSinceLastUpdate = (now - lastUpdateTime) / 60000; // in minutes
      
      // If more than 5 minutes have passed, assume the app was closed and reset
      // This prevents huge time jumps when reopening the app
      if (timeSinceLastUpdate > 5) {
        localStorage.setItem(lastUpdateKey, now.toString());
      }
    } else {
      localStorage.setItem(lastUpdateKey, now.toString());
    }
    
    if (!localStorage.getItem(sessionKey)) {
      localStorage.setItem(sessionKey, startTime.toString());
    }

    const updateTimeSpent = () => {
      const lastUpdate = localStorage.getItem(lastUpdateKey);
      if (lastUpdate) {
        const currentTime = Date.now();
        const elapsedMs = currentTime - parseInt(lastUpdate);
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        
        // Cap elapsed time at 5 minutes to prevent huge jumps
        // If more than 5 minutes passed, the app was likely closed
        const cappedElapsed = Math.min(elapsedMinutes, 5);
        
        if (cappedElapsed > 0) {
          const today = new Date().toISOString().split('T')[0];
          const timeKey = `time_spent_${user.id}_${today}`;
          const existing = parseInt(localStorage.getItem(timeKey) || '0');
          localStorage.setItem(timeKey, (existing + cappedElapsed).toString());
          localStorage.setItem(lastUpdateKey, currentTime.toString());
        }
      }
    };

    // Update every 60 seconds (1 minute)
    const interval = setInterval(updateTimeSpent, 60000);
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - save current time
        updateTimeSpent();
      } else {
        // Tab is visible again - reset lastUpdate to now to prevent counting time while hidden
        localStorage.setItem(lastUpdateKey, Date.now().toString());
      }
    };

    // Track when window is about to close
    const handleBeforeUnload = () => {
      updateTimeSpent();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateTimeSpent();
    };
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCreativeStats(), loadJournalData()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCreativeStats = async () => {
    const startDate = viewMode === 'daily'
      ? new Date(selectedDate)
      : viewMode === 'weekly'
      ? new Date(selectedDate)
      : getStartOfMonth(selectedDate);
    
    const endDate = viewMode === 'daily'
      ? new Date(selectedDate)
      : viewMode === 'weekly'
      ? new Date(selectedDate)
      : getEndOfMonth(selectedDate);

    if (viewMode === 'weekly') {
      startDate.setDate(selectedDate.getDate() - selectedDate.getDay());
      endDate.setDate(startDate.getDate() + 6);
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const [allIdeasResult, allMindMapsResult, ideasResult, mindMapsResult] = await Promise.all([
      supabase.from('ideas').select('id, created_at').eq('user_id', user!.id),
      supabase.from('mind_maps').select('id, created_at').eq('user_id', user!.id),
      supabase.from('ideas').select('id, created_at').eq('user_id', user!.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true }),
      supabase.from('mind_maps').select('id, created_at').eq('user_id', user!.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true }),
    ]);

    const allIdeas = allIdeasResult.data || [];
    const allMindMaps = allMindMapsResult.data || [];
    const periodIdeas = ideasResult.data || [];
    const periodMindMaps = mindMapsResult.data || [];

    const days: DayActivity[] = [];
    const daysCount = viewMode === 'daily' ? 1 : viewMode === 'weekly' ? 7 : getDaysInMonth(selectedDate);

    for (let i = 0; i < daysCount; i++) {
      const currentDay = new Date(startDate);
      if (viewMode === 'weekly') {
        currentDay.setDate(startDate.getDate() + i);
      } else if (viewMode === 'monthly') {
        currentDay.setDate(i + 1);
      }
      currentDay.setHours(0, 0, 0, 0);
      const nextDay = new Date(currentDay);
      nextDay.setDate(currentDay.getDate() + 1);

      const dayIdeas = periodIdeas.filter(idea => {
        const created = new Date(idea.created_at);
        return created >= currentDay && created < nextDay;
      });

      const dayMindMaps = periodMindMaps.filter(map => {
        const created = new Date(map.created_at);
        return created >= currentDay && created < nextDay;
      });

      const dayKey = currentDay.toISOString().split('T')[0];
      const dayTime = parseInt(localStorage.getItem(`time_spent_${user!.id}_${dayKey}`) || '0');

      days.push({
        date: currentDay,
        ideas: dayIdeas.length,
        mindMaps: dayMindMaps.length,
        timeSpent: dayTime,
      });
    }

    setDailyActivity(days);

    let totalTime = 0;
    for (let i = 0; i < 365; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = `time_spent_${user!.id}_${date.toISOString().split('T')[0]}`;
      const dayTime = parseInt(localStorage.getItem(dateKey) || '0');
      // Cap daily time at 24 hours (1440 minutes) to prevent obviously incorrect values
      totalTime += Math.min(dayTime, 1440);
    }

    // Calculate period time, capping each day at 24 hours
    const periodTime = days.reduce((sum, d) => sum + Math.min(d.timeSpent, 1440), 0);
    
    setStats({
      totalIdeas: allIdeas.length,
      totalMindMaps: allMindMaps.length,
      totalTimeSpent: totalTime,
      ideasThisPeriod: periodIdeas.length,
      mindMapsThisPeriod: periodMindMaps.length,
      timeSpentThisPeriod: periodTime,
    });
  };

  const loadJournalData = async () => {
    try {
      // Load journal entries from the last 3 months for emotion tracking
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);

      const { data: allEntries } = await supabase
        .from('journal_entries')
        .select('id, content, entry_date, created_at')
        .eq('user_id', user!.id)
        .gte('entry_date', threeMonthsAgo.toISOString().split('T')[0])
        .order('entry_date', { ascending: false });

      if (!allEntries || allEntries.length === 0) {
        setEmotionData([]);
        setPeriodEmotionData([]);
        setWordFrequencies([]);
        return;
      }

      const allEntryIds = allEntries.map(e => e.id);
      const { data: allAnalyses } = await supabase
        .from('ai_analysis')
        .select('entry_id, emotions, analyzed_at')
        .eq('user_id', user!.id)
        .in('entry_id', allEntryIds);

      // Filter for period
      const startDate = viewMode === 'daily'
        ? new Date(selectedDate)
        : viewMode === 'weekly'
        ? new Date(selectedDate)
        : getStartOfMonth(selectedDate);
      
      const endDate = viewMode === 'daily'
        ? new Date(selectedDate)
        : viewMode === 'weekly'
        ? new Date(selectedDate)
        : getEndOfMonth(selectedDate);

      if (viewMode === 'weekly') {
        startDate.setDate(selectedDate.getDate() - selectedDate.getDay());
        endDate.setDate(startDate.getDate() + 6);
      }
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      const allEmotions: EmotionData[] = [];
      if (allAnalyses) {
        allAnalyses.forEach(analysis => {
          const entry = allEntries.find(e => e.id === analysis.entry_id);
          if (entry && analysis.emotions && Array.isArray(analysis.emotions)) {
            analysis.emotions.forEach((emotion: { name: string; intensity: number }) => {
              allEmotions.push({
                date: new Date(entry.entry_date),
                emotion: emotion.name,
                intensity: emotion.intensity || 50,
              });
            });
          }
        });
      }

      const periodEmotions = allEmotions.filter(e => {
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
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'from', 'up', 'about', 'into', 'through', 'during', 'including', 'against', 'among',
        'throughout', 'despite', 'towards', 'upon', 'concerning', 'i', 'me', 'my',
        'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
        'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
        'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this',
        'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
        'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'should', 'could',
        'may', 'might', 'must', 'can', 'cannot',
        // Spanish
        'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero', 'en', 'de', 'a',
        'para', 'por', 'con', 'sin', 'sobre', 'entre', 'hasta', 'desde', 'durante', 'mediante',
        'yo', 'me', 'mi', 'mío', 'mía', 'míos', 'mías', 'nosotros', 'nosotras', 'nuestro', 'nuestra',
        'tú', 'te', 'ti', 'tu', 'tuyo', 'tuya', 'tuyos', 'tuyas', 'él', 'ella', 'ello', 'le', 'lo',
        'la', 'les', 'los', 'su', 'suyo', 'suyos', 'suyas', 'ese', 'esa', 'eso', 'esos', 'esas',
        'este', 'esta', 'esto', 'estos', 'estas', 'aquel', 'aquella', 'aquello', 'aquellos', 'aquellas',
        'soy', 'eres', 'es', 'somos', 'sois', 'son', 'era', 'eras', 'éramos', 'erais', 'eran',
        'fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron', 'ser', 'estar', 'tener', 'haber',
        'hacer', 'poder', 'deber', 'querer', 'saber', 'decir', 'ir', 'venir', 'ver', 'dar',
      ]);

      allEntries.forEach(entry => {
        if (entry.content) {
          // Use Unicode-aware regex to preserve accented characters
          // \p{L} matches any Unicode letter, \p{N} matches any Unicode number
          // This preserves Spanish, Chinese, and other accented characters
          const words = entry.content
            .toLowerCase()
            // Remove punctuation but preserve accented letters and numbers
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
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
      console.error('Error loading journal data:', error);
    }
  };

  return {
    stats,
    dailyActivity,
    emotionData,
    periodEmotionData,
    wordFrequencies,
    loading
  };
}

