import { useState, useEffect, useCallback } from "react";
import { exportAllData } from "../services/exportService";
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
  BellOff,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Header } from "../components/ui";
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
} from "../services/userPreferencesService";
import type { NotificationPreferences } from "../services/userPreferencesService";

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm}`;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    notify_journal_reminder: true,
    notify_streak_alert: true,
    notify_task_due: true,
    notify_weekly_digest: true,
    reminder_hour: 20,
    timezone: null,
  });
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadNotificationPrefs(user.id).then((prefs) => {
      setNotifPrefs(prefs);
      setNotifLoaded(true);
    });
  }, [user]);

  const updateNotifPref = useCallback(
    (key: keyof NotificationPreferences, value: boolean | number) => {
      if (!user) return;
      const updated = { ...notifPrefs, [key]: value };
      setNotifPrefs(updated);
      saveNotificationPrefs(user.id, { [key]: value });
      // Dispatch event so notificationScheduler can reschedule
      window.dispatchEvent(
        new CustomEvent("notificationPrefsChanged", { detail: updated }),
      );
    },
    [user, notifPrefs],
  );

  if (!user) return null;

  const languages = [
    { code: "en" as const, label: "English" },
    { code: "es" as const, label: "Español" },
    { code: "zh" as const, label: "中文" },
  ];

  const toggleRowClass =
    "w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Header title={t("settings.title") || "Settings"} showBack />

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

          <button onClick={toggleTheme} className={toggleRowClass}>
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

        {/* Notifications */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-4 pt-4 pb-2">
            {t("settings.notifications") || "Notifications"}
          </h3>

          {notifLoaded ? (
            <>
              {/* Journal Reminder */}
              <div className={toggleRowClass}>
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-text-secondary" />
                  <span className="text-sm text-text-primary">
                    {t("settings.journalReminder") || "Journal reminder"}
                  </span>
                </div>
                <button
                  onClick={() =>
                    updateNotifPref(
                      "notify_journal_reminder",
                      !notifPrefs.notify_journal_reminder,
                    )
                  }
                  className={`w-10 h-6 rounded-full transition-colors relative p-0 shrink-0 ${
                    notifPrefs.notify_journal_reminder
                      ? "bg-indigo-600"
                      : "bg-gray-300 dark:bg-gray-700"
                  }`}
                  aria-label={
                    t("settings.journalReminder") || "Toggle journal reminder"
                  }
                >
                  <span
                    className={`absolute left-0 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      notifPrefs.notify_journal_reminder
                        ? "translate-x-[18px]"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Reminder Hour */}
              {notifPrefs.notify_journal_reminder && (
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 ml-8">
                    <Clock className="w-4 h-4 text-text-tertiary" />
                    <span className="text-sm text-text-secondary">
                      {t("settings.reminderTime") || "Reminder time"}
                    </span>
                  </div>
                  <select
                    value={notifPrefs.reminder_hour}
                    onChange={(e) =>
                      updateNotifPref("reminder_hour", Number(e.target.value))
                    }
                    className="text-sm bg-gray-100 dark:bg-gray-800 text-text-primary rounded-lg px-2 py-1 border-0 focus:ring-2 focus:ring-indigo-500"
                    aria-label={
                      t("settings.reminderTime") || "Select reminder time"
                    }
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {formatHour(i)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Streak Alert */}
              <div className={toggleRowClass}>
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-text-secondary" />
                  <span className="text-sm text-text-primary">
                    {t("settings.streakAlert") || "Streak alert"}
                  </span>
                </div>
                <button
                  onClick={() =>
                    updateNotifPref(
                      "notify_streak_alert",
                      !notifPrefs.notify_streak_alert,
                    )
                  }
                  className={`w-10 h-6 rounded-full transition-colors relative p-0 shrink-0 ${
                    notifPrefs.notify_streak_alert
                      ? "bg-indigo-600"
                      : "bg-gray-300 dark:bg-gray-700"
                  }`}
                  aria-label={
                    t("settings.streakAlert") || "Toggle streak alert"
                  }
                >
                  <span
                    className={`absolute left-0 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      notifPrefs.notify_streak_alert
                        ? "translate-x-[18px]"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Task Due */}
              <div className={toggleRowClass}>
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-text-secondary" />
                  <span className="text-sm text-text-primary">
                    {t("settings.taskDue") || "Task due dates"}
                  </span>
                </div>
                <button
                  onClick={() =>
                    updateNotifPref(
                      "notify_task_due",
                      !notifPrefs.notify_task_due,
                    )
                  }
                  className={`w-10 h-6 rounded-full transition-colors relative p-0 shrink-0 ${
                    notifPrefs.notify_task_due
                      ? "bg-indigo-600"
                      : "bg-gray-300 dark:bg-gray-700"
                  }`}
                  aria-label={t("settings.taskDue") || "Toggle task due alerts"}
                >
                  <span
                    className={`absolute left-0 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      notifPrefs.notify_task_due
                        ? "translate-x-[18px]"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Weekly Digest */}
              <div className={toggleRowClass}>
                <div className="flex items-center gap-3">
                  <BellOff className="w-5 h-5 text-text-tertiary" />
                  <div>
                    <span className="text-sm text-text-secondary">
                      {t("settings.weeklyDigest") || "Weekly digest"}
                    </span>
                    <span className="text-xs text-text-tertiary ml-2">
                      {t("common.comingSoon") || "Coming soon"}
                    </span>
                  </div>
                </div>
                <button
                  disabled
                  className="w-10 h-6 rounded-full bg-gray-300 dark:bg-gray-700 relative opacity-50 cursor-not-allowed"
                  aria-label={
                    t("settings.weeklyDigest") || "Weekly digest toggle"
                  }
                >
                  <span className="absolute top-0.5 translate-x-0.5 w-5 h-5 rounded-full bg-white shadow" />
                </button>
              </div>
            </>
          ) : (
            <div className="px-4 py-3 flex items-center gap-3 text-text-tertiary">
              <Bell className="w-5 h-5 animate-pulse" />
              <span className="text-sm">
                {t("common.loading") || "Loading..."}
              </span>
            </div>
          )}
        </section>

        {/* Data */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-4 pt-4 pb-2">
            {t("settings.data") || "Data"}
          </h3>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-text-secondary" />
              <span className="text-sm text-text-primary">
                {t("settings.exportData") || "Export My Data"}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                disabled={exporting}
                onClick={async () => {
                  setExporting(true);
                  await exportAllData(user.id, "json").finally(() =>
                    setExporting(false),
                  );
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {exporting ? t("settings.exporting") || "Exporting..." : "JSON"}
              </button>
              <button
                disabled={exporting}
                onClick={async () => {
                  setExporting(true);
                  await exportAllData(user.id, "markdown").finally(() =>
                    setExporting(false),
                  );
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {exporting
                  ? t("settings.exporting") || "Exporting..."
                  : "Markdown"}
              </button>
            </div>
          </div>
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
