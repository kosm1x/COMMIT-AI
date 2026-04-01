import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { useLanguage } from "../contexts/LanguageContext";
import { logger } from "../utils/logger";

export interface OnboardingDayConfig {
  day: number;
  focus: string;
  page: string;
  bannerText: string;
  ctaText: string;
}

const DAY_CONFIGS: OnboardingDayConfig[] = [
  {
    day: 1,
    focus: "Vision",
    page: "/objectives",
    bannerText: "onboarding.day1",
    ctaText: "onboarding.day1Cta",
  },
  {
    day: 2,
    focus: "Journal",
    page: "/journal",
    bannerText: "onboarding.day2",
    ctaText: "onboarding.day2Cta",
  },
  {
    day: 3,
    focus: "Goal",
    page: "/objectives",
    bannerText: "onboarding.day3",
    ctaText: "onboarding.day3Cta",
  },
  {
    day: 4,
    focus: "Breakdown",
    page: "/objectives",
    bannerText: "onboarding.day4",
    ctaText: "onboarding.day4Cta",
  },
  {
    day: 5,
    focus: "Action",
    page: "/objectives",
    bannerText: "onboarding.day5",
    ctaText: "onboarding.day5Cta",
  },
  {
    day: 6,
    focus: "Review",
    page: "/track",
    bannerText: "onboarding.day6",
    ctaText: "onboarding.day6Cta",
  },
  {
    day: 7,
    focus: "Streak",
    page: "/journal",
    bannerText: "onboarding.day7",
    ctaText: "onboarding.day7Cta",
  },
];

export interface UseOnboardingReturn {
  day: number;
  isActive: boolean;
  availableDay: number;
  isDayComplete: boolean;
  dayConfig: OnboardingDayConfig | null;
  advance: () => Promise<void>;
  dismiss: () => Promise<void>;
  loading: boolean;
}

export function useOnboarding(): UseOnboardingReturn {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { t } = useLanguage();
  const [day, setDay] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load onboarding state from DB
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (cancelled) return;
      const raw = data as Record<string, unknown> | null;
      setDay((raw?.onboarding_day as number) ?? 0);
      setStartedAt((raw?.onboarding_started_at as string) ?? null);
      setCompletedAt((raw?.onboarding_completed_at as string) ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Calculate available day based on time since onboarding started
  const availableDay = (() => {
    if (!startedAt) return 1; // Day 1 available immediately after welcome
    const daysSinceStart = Math.floor(
      (Date.now() - new Date(startedAt).getTime()) / (24 * 60 * 60 * 1000),
    );
    return Math.min(7, daysSinceStart + 1);
  })();

  const isActive = !completedAt && day < 8;
  const isDayComplete = day >= availableDay;
  const dayConfig =
    isActive && availableDay <= 7
      ? (DAY_CONFIGS[availableDay - 1] ?? null)
      : null;

  const advance = useCallback(async () => {
    if (!user?.id || !isActive) return;

    const newDay = day + 1;
    const updates: Record<string, unknown> = { onboarding_day: newDay };

    // Set started_at on first advance (day 0 → 1)
    if (!startedAt) {
      const now = new Date().toISOString();
      updates.onboarding_started_at = now;
      setStartedAt(now);
    }

    // Complete onboarding on day 7
    if (newDay >= 7) {
      const now = new Date().toISOString();
      updates.onboarding_completed_at = now;
      setCompletedAt(now);
    }

    try {
      await supabase
        .from("user_preferences")
        .update(updates as Record<string, unknown>)
        .eq("user_id", user.id);

      setDay(newDay);

      // Show toast with next step info
      if (newDay < 7) {
        const nextConfig = DAY_CONFIGS[newDay]; // next day's config (0-indexed)
        if (nextConfig) {
          notify({
            type: "success",
            message: t("onboarding.stepComplete") || "Step complete!",
            detail:
              t(nextConfig.bannerText) ||
              `Day ${newDay + 1}: ${nextConfig.focus}`,
          });
        }
      } else {
        notify({
          type: "success",
          message:
            t("onboarding.complete") || "You've completed the COMMIT journey!",
        });
      }
    } catch (error) {
      logger.error("Failed to advance onboarding:", error);
    }
  }, [user?.id, isActive, day, startedAt, notify, t]);

  const dismiss = useCallback(async () => {
    if (!user?.id) return;

    const now = new Date().toISOString();
    try {
      await supabase
        .from("user_preferences")
        .update({
          onboarding_completed_at: now,
        } as Record<string, unknown>)
        .eq("user_id", user.id);

      setCompletedAt(now);
    } catch (error) {
      logger.error("Failed to dismiss onboarding:", error);
    }
  }, [user?.id]);

  // Listen for onboarding events from other components
  useEffect(() => {
    const handler = () => {
      if (isActive && !isDayComplete) {
        advance();
      }
    };

    window.addEventListener("onboardingAdvance", handler);
    return () => window.removeEventListener("onboardingAdvance", handler);
  }, [isActive, isDayComplete, advance]);

  return {
    day,
    isActive,
    availableDay,
    isDayComplete,
    dayConfig,
    advance,
    dismiss,
    loading,
  };
}
