import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  calculateJournalStreak,
  detectMilestone,
} from "../utils/streakCalculator";

const CELEBRATED_KEY = (uid: string) => `streak_milestones_celebrated_${uid}`;

export function useStreakCelebration() {
  const { user } = useAuth();
  const [showCelebration, setShowCelebration] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const { data } = await supabase
        .from("journal_entries")
        .select("entry_date")
        .eq("user_id", user.id)
        .gte("entry_date", thirtyDaysAgo)
        .order("entry_date", { ascending: false });

      const dates = (data ?? []).map((r) => r.entry_date as string);
      const streak = calculateJournalStreak(dates);
      const hit = detectMilestone(streak.current);

      if (!hit) return;

      // Check if already celebrated
      const raw = localStorage.getItem(CELEBRATED_KEY(user.id));
      const celebrated: number[] = raw ? JSON.parse(raw) : [];

      if (celebrated.includes(hit)) return;

      setMilestone(hit);
      setShowCelebration(true);
    };

    check();
  }, [user]);

  const dismiss = useCallback(() => {
    if (user && milestone) {
      const raw = localStorage.getItem(CELEBRATED_KEY(user.id));
      const celebrated: number[] = raw ? JSON.parse(raw) : [];
      if (!celebrated.includes(milestone)) {
        celebrated.push(milestone);
        localStorage.setItem(
          CELEBRATED_KEY(user.id),
          JSON.stringify(celebrated),
        );
      }
    }
    setShowCelebration(false);
    setMilestone(null);
  }, [user, milestone]);

  return { showCelebration, milestone, dismiss };
}
