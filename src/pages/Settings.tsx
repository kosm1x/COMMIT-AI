import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import {
  Moon,
  Sun,
  Globe,
  LogOut,
  Download,
  BookOpen,
  Bell,
  ChevronRight,
} from "lucide-react";
import { Header } from "../components/ui";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  if (!user) return null;

  const languages = [
    { code: "en" as const, label: "English" },
    { code: "es" as const, label: "Español" },
    { code: "zh" as const, label: "中文" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Header title={t("settings.title") || "Settings"} />

      <div className="flex-1 p-4 pb-24 max-w-2xl mx-auto w-full space-y-6">
        {/* Profile */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user.email}
              </p>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-4 pt-4 pb-2">
            {t("settings.appearance") || "Appearance"}
          </h3>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="w-5 h-5 text-text-secondary" />
              ) : (
                <Sun className="w-5 h-5 text-text-secondary" />
              )}
              <span className="text-sm text-text-primary">
                {t("settings.theme") || "Theme"}
              </span>
            </div>
            <span className="text-sm text-text-tertiary capitalize">
              {theme}
            </span>
          </button>

          <div className="px-4 py-3">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-text-secondary" />
              <span className="text-sm text-text-primary">
                {t("settings.language") || "Language"}
              </span>
            </div>
            <div className="flex gap-2 ml-8">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    language === lang.code
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Notifications (placeholder for Session 3) */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-4 pt-4 pb-2">
            {t("settings.notifications") || "Notifications"}
          </h3>
          <div className="px-4 py-3 flex items-center gap-3 text-text-tertiary">
            <Bell className="w-5 h-5" />
            <span className="text-sm">
              {t("settings.notificationsComingSoon") ||
                "Push notifications coming soon"}
            </span>
          </div>
        </section>

        {/* Data */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-4 pt-4 pb-2">
            {t("settings.data") || "Data"}
          </h3>
          <button
            disabled
            className="w-full flex items-center justify-between px-4 py-3 opacity-50 cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-text-secondary" />
              <span className="text-sm text-text-primary">
                {t("settings.exportData") || "Export My Data"}
              </span>
            </div>
            <span className="text-xs text-text-tertiary">
              {t("common.comingSoon") || "Coming soon"}
            </span>
          </button>
        </section>

        {/* About */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-4 pt-4 pb-2">
            {t("settings.about") || "About"}
          </h3>
          <button
            onClick={() => {
              localStorage.removeItem(`commit_welcome_modal_seen_${user.id}`);
              window.location.reload();
            }}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-text-secondary" />
              <span className="text-sm text-text-primary">
                {t("settings.showGuide") || "Show COMMIT Guide"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-text-tertiary" />
          </button>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-text-tertiary">COMMIT v4.0</p>
          </div>
        </section>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t("settings.signOut") || "Sign Out"}
        </button>
      </div>
    </div>
  );
}
