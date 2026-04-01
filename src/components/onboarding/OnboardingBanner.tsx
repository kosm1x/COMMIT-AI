import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, X, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import type { OnboardingDayConfig } from "../../hooks/useOnboarding";

interface OnboardingBannerProps {
  day: number;
  availableDay: number;
  isDayComplete: boolean;
  dayConfig: OnboardingDayConfig | null;
  onDismiss: () => void;
}

export default function OnboardingBanner({
  day,
  availableDay,
  isDayComplete,
  dayConfig,
  onDismiss,
}: OnboardingBannerProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (!dayConfig) return null;

  const progress = Math.round((day / 7) * 100);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="mx-4 mt-3 flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 transition-colors"
        aria-label={t("onboarding.expand") || "Show onboarding progress"}
      >
        <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">
          {availableDay}
        </span>
        <span>
          Day {availableDay}/7 — {dayConfig.focus}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className="mx-4 mt-3 bg-indigo-600/5 dark:bg-indigo-500/5 border border-indigo-500/20 rounded-xl overflow-hidden animate-slide-down">
      {/* Progress bar */}
      <div className="h-1 bg-indigo-100 dark:bg-indigo-950/50">
        <div
          className="h-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="px-4 py-3 flex items-center gap-3">
        {/* Day badge */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white text-sm font-bold flex items-center justify-center">
          {availableDay}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Day {availableDay}/7 — {dayConfig.focus}
            </span>
          </div>
          <p className="text-sm text-text-primary truncate">
            {t(dayConfig.bannerText) ||
              `Day ${availableDay}: ${dayConfig.focus}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isDayComplete && (
            <button
              onClick={() => navigate(dayConfig.page)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
              aria-label={t(dayConfig.ctaText) || "Go"}
            >
              {t(dayConfig.ctaText) || "Go"}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
          {isDayComplete && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2">
              {t("onboarding.unlocksTomorrow") || "Next day unlocks tomorrow"}
            </span>
          )}
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 text-text-tertiary hover:text-text-secondary transition-colors"
            aria-label={t("onboarding.collapse") || "Collapse"}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={onDismiss}
            className="p-1 text-text-tertiary hover:text-text-secondary transition-colors"
            aria-label={t("onboarding.dismiss") || "Dismiss onboarding"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
