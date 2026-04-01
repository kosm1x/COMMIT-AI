import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { X, Target, Map, Lightbulb, BookOpen, TrendingUp } from "lucide-react";

const WELCOME_MODAL_KEY = "commit_welcome_modal_seen";

export default function WelcomeModal() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      // Show modal only on first login — never re-trigger on language change
      const hasSeenModal = localStorage.getItem(
        `${WELCOME_MODAL_KEY}_${user.id}`,
      );
      if (!hasSeenModal) {
        setTimeout(() => setIsOpen(true), 500);
      }
    }
  }, [user]);

  const handleClose = () => {
    if (user) {
      localStorage.setItem(`${WELCOME_MODAL_KEY}_${user.id}`, "true");
    }
    setIsOpen(false);
    // Dispatch onboarding advance — transitions from day 0 to day 1
    window.dispatchEvent(new CustomEvent("onboardingAdvance"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
      <div className="glass-strong rounded-3xl max-w-3xl w-full shadow-2xl border border-white/20 dark:border-white/10 animate-scale-in max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative p-6 sm:p-8 border-b border-border-secondary">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-tertiary hover:text-text-primary"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <img
                src="/logo-icon.png"
                alt="COMMIT"
                className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
                {t("welcome.title")}
              </h2>
              <p className="text-text-secondary text-sm sm:text-base">
                {t("welcome.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-text-secondary leading-relaxed mb-4">
              {t("welcome.intro")}
            </p>
          </div>

          {/* Five Pillars */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-text-primary mb-4">
              {t("welcome.pillarsTitle")}
            </h3>

            {/* 1. Context */}
            <div className="flex gap-4 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold text-text-primary mb-2">
                  {t("welcome.pillar1Title")}
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t("welcome.pillar1Description")}
                </p>
              </div>
            </div>

            {/* 2. Objectives */}
            <div className="flex gap-4 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold text-text-primary mb-2">
                  {t("welcome.pillar2Title")}
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t("welcome.pillar2Description")}
                </p>
              </div>
            </div>

            {/* 3. Maps */}
            <div className="flex gap-4 p-4 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                  <Map className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold text-text-primary mb-2">
                  {t("welcome.pillar3Title")}
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t("welcome.pillar3Description")}
                </p>
              </div>
            </div>

            {/* 4. Ideation */}
            <div className="flex gap-4 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold text-text-primary mb-2">
                  {t("welcome.pillar4Title")}
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t("welcome.pillar4Description")}
                </p>
              </div>
            </div>

            {/* 5. Tracking */}
            <div className="flex gap-4 p-4 rounded-xl bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold text-text-primary mb-2">
                  {t("welcome.pillar5Title")}
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t("welcome.pillar5Description")}
                </p>
              </div>
            </div>
          </div>

          {/* Why It Works */}
          <div className="mt-8 p-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/30">
            <h3 className="text-lg font-bold text-text-primary mb-3">
              {t("welcome.whyItWorksTitle")}
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              {t("welcome.whyItWorksDescription")}
            </p>
            <ol className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>{t("welcome.step1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>{t("welcome.step2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>{t("welcome.step3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>{t("welcome.step4")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                  5
                </span>
                <span>{t("welcome.step5")}</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 border-t border-border-secondary">
          <button
            onClick={handleClose}
            className="w-full btn-primary h-12 text-base group"
          >
            {t("welcome.getStarted")}
            <span className="ml-2 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
