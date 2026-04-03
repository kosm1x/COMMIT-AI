import { useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

interface CelebrationProps {
  milestone: number;
  onDismiss: () => void;
}

const CONFETTI_COLORS = [
  "#4F46E5",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

export default function Celebration({
  milestone,
  onDismiss,
}: CelebrationProps) {
  const { t } = useLanguage();

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Generate confetti pieces with random properties
  const confetti = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 6,
  }));

  const congratsText = (
    t("tracking.streakCongrats") ||
    "You've maintained a {days}-day journal streak!"
  ).replace("{days}", String(milestone));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label={t("tracking.streakMilestone") || "Streak Milestone"}
    >
      {/* Confetti */}
      {confetti.map((piece) => (
        <span
          key={piece.id}
          className="absolute animate-confetti pointer-events-none rounded-sm"
          style={{
            left: piece.left,
            top: "-10px",
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            animationDelay: piece.delay,
          }}
        />
      ))}

      {/* Card */}
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 max-w-sm mx-4 text-center animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-4">
          {milestone >= 30 ? "🏆" : milestone >= 7 ? "🔥" : "⭐"}
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-1">
          {t("tracking.streakMilestone") || "Streak Milestone!"}
        </h2>
        <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mb-2">
          {milestone}
        </p>
        <p className="text-sm text-text-secondary mb-4">{congratsText}</p>
        <button
          onClick={onDismiss}
          className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {t("tracking.keepGoing") || "Keep going!"}
        </button>
      </div>
    </div>
  );
}
