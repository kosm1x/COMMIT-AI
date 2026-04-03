import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import DashboardLayout from "../components/tracking/DashboardLayout";
import InsightsCard from "../components/tracking/InsightsCard";
import { Header } from "../components/ui";

export default function Tracking() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );
  const [selectedDate] = useState(new Date());

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Header
        title={t("tracking.title")}
        rightAction={
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            {(["daily", "weekly", "monthly"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  activeTab === tab
                    ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t(`tracking.${tab}`)}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 p-4 pb-24 max-w-7xl mx-auto w-full space-y-4">
        <InsightsCard />
        <DashboardLayout activeTab={activeTab} selectedDate={selectedDate} />
      </div>
    </div>
  );
}
