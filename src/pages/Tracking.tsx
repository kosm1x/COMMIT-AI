import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Activity,
} from 'lucide-react';
import DashboardLayout from '../components/tracking/DashboardLayout';

export default function Tracking() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate] = useState(new Date());

  if (!user) return null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-text-primary">{t('tracking.title')}</h1>
            <p className="text-text-tertiary">{t('tracking.description')}</p>
          </div>
        </div>

        <div className="glass-card p-1 flex items-center gap-1 rounded-xl border border-white/40 dark:border-white/10 bg-white dark:bg-black/40">
          {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                activeTab === tab
                  ? 'bg-white dark:bg-white/10 text-accent-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white dark:hover:bg-white/10'
              }`}
            >
              {t(`tracking.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Layout */}
      <DashboardLayout activeTab={activeTab} selectedDate={selectedDate} />
    </div>
  );
}
