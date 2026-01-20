import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { TabBar, BottomSheet, Button } from '../ui';
import { Moon, Sun, Globe, LogOut } from 'lucide-react';
import WelcomeModal from '../WelcomeModal';
import { useLastPageTracking } from '../../hooks/useLastPageTracking';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useLastPageTracking();

  const tabTranslations = {
    journal: t('nav.journal'),
    goals: t('nav.goals'),
    boards: t('nav.kanbanBoards'),
    ideate: t('nav.ideate'),
    track: t('nav.progressTracking'),
  };

  return (
    <>
      <WelcomeModal />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="pb-20 min-h-screen">
          {children}
        </main>

        <TabBar 
          translations={tabTranslations} 
          onSettingsClick={() => setSettingsOpen(true)} 
        />

        <BottomSheet
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          title={t('common.settings') || 'Settings'}
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.email}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.account') || 'Account'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                {t('common.appearance') || 'Appearance'}
              </p>
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
                <span className="text-gray-900 dark:text-gray-100">
                  {theme === 'light' ? t('common.darkMode') || 'Dark Mode' : t('common.lightMode') || 'Light Mode'}
                </span>
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                {t('language.selectLanguage') || 'Language'}
              </p>
              <div className="space-y-1">
                {(['en', 'es', 'zh'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      language === lang
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <Globe className="w-5 h-5" />
                    <span>
                      {lang === 'en' ? 'English' : lang === 'es' ? 'Español' : '中文'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button
                variant="danger"
                fullWidth
                onClick={signOut}
              >
                <LogOut className="w-4 h-4" />
                {t('nav.signOut') || 'Sign Out'}
              </Button>
            </div>
          </div>
        </BottomSheet>
      </div>
    </>
  );
}

export function useSettingsSheet() {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}
