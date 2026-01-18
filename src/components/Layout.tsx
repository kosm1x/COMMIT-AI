import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LogOut, Menu, X, Search, ChevronLeft, ChevronRight, Command, Moon, Sun, Globe, User, ChevronDown } from 'lucide-react';
import { getTranslatedNavigationGroups } from '../config/navigation';
import NavigationGroup from './navigation/NavigationGroup';
import CommandPalette from './navigation/CommandPalette';
import BottomTabBar from './navigation/BottomTabBar';
import QuickActions from './navigation/QuickActions';
import Breadcrumbs from './navigation/Breadcrumbs';
import WelcomeModal from './WelcomeModal';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const navigationGroups = useMemo(() => getTranslatedNavigationGroups(t), [t]);

  useKeyboardShortcuts({
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
  });

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <>
      <WelcomeModal />
      <div className="min-h-screen bg-bg-secondary flex">
      {/* Desktop Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-72'
        } hidden lg:flex flex-col fixed inset-y-4 left-4 z-50 glass-strong transition-all duration-300 ease-in-out border border-border-primary rounded-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className={`p-4 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} border-b border-border-secondary/50`}>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            title={t('nav.goToHome')}
          >
            <img 
              src="/logo-icon.png" 
              alt="COMMIT" 
              className="w-[200px] h-[200px] object-contain"
            />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-4">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-2'
            } py-2.5 bg-bg-secondary hover:bg-bg-tertiary border border-border-secondary rounded-xl transition-all duration-200 group`}
          >
            <Search className="w-4 h-4 text-text-tertiary group-hover:text-accent-primary transition-colors" />
            {!sidebarCollapsed && (
              <>
                <span className="text-sm text-text-secondary font-medium">{t('common.search')}</span>
                <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-bg-primary border border-border-primary">
                  <Command className="w-3 h-3 text-text-tertiary" />
                  <span className="text-[10px] text-text-tertiary font-bold">K</span>
                </div>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          {navigationGroups.map((group) => (
            <NavigationGroup
              key={group.id}
              group={group}
              collapsed={sidebarCollapsed}
              onNavigate={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border-secondary/50 bg-bg-secondary/30">
          {!sidebarCollapsed ? (
            <div className="animate-fade-in">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-full flex items-center gap-3 mb-3 p-2 rounded-xl bg-white/50 dark:bg-white/5 border border-border-secondary hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-text-primary truncate">My Workspace</p>
                    <p className="text-[10px] text-text-tertiary truncate">{user?.email}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* User Menu Dropdown */}
                {userMenuOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-border-primary overflow-hidden z-50 animate-in slide-in-from-bottom-2">
                    {/* Language Selector */}
                    <div className="p-2 border-b border-border-secondary">
                      <div className="px-2 py-1.5 text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">
                        {t('language.selectLanguage')}
                      </div>
                      <button
                        onClick={() => {
                          setLanguage('en');
                          setUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary transition-colors ${
                          language === 'en' ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {t('language.english')}
                      </button>
                      <button
                        onClick={() => {
                          setLanguage('es');
                          setUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary transition-colors ${
                          language === 'es' ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {t('language.spanish')}
                      </button>
                      <button
                        onClick={() => {
                          setLanguage('zh');
                          setUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary transition-colors ${
                          language === 'zh' ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {t('language.chinese')}
                      </button>
                    </div>
                    
                    {/* Theme Toggle */}
                    <button
                      onClick={() => {
                        toggleTheme();
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-bg-tertiary transition-colors"
                    >
                      {theme === 'light' ? (
                        <Moon className="w-3.5 h-3.5" />
                      ) : (
                        <Sun className="w-3.5 h-3.5" />
                      )}
                      {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                    </button>
                    
                    {/* Sign Out */}
                    <button
                      onClick={() => {
                        signOut();
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-text-tertiary hover:text-accent-primary hover:bg-accent-subtle rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Collapse
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 items-center">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="p-2 text-text-secondary hover:text-accent-primary hover:bg-accent-subtle rounded-lg transition-colors"
                  title={user?.email}
                >
                  <User className="w-5 h-5" />
                </button>
                
                {/* User Menu Dropdown (Collapsed) */}
                {userMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-border-primary overflow-hidden z-50 animate-in slide-in-from-bottom-2">
                    {/* Language Selector */}
                    <div className="p-2 border-b border-border-secondary">
                      <div className="px-2 py-1.5 text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">
                        {t('language.selectLanguage')}
                      </div>
                      <button
                        onClick={() => {
                          setLanguage('en');
                          setUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary transition-colors ${
                          language === 'en' ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {t('language.english')}
                      </button>
                      <button
                        onClick={() => {
                          setLanguage('es');
                          setUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary transition-colors ${
                          language === 'es' ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {t('language.spanish')}
                      </button>
                      <button
                        onClick={() => {
                          setLanguage('zh');
                          setUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary transition-colors ${
                          language === 'zh' ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {t('language.chinese')}
                      </button>
                    </div>
                    
                    {/* Theme Toggle */}
                    <button
                      onClick={() => {
                        toggleTheme();
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-bg-tertiary transition-colors"
                    >
                      {theme === 'light' ? (
                        <Moon className="w-3.5 h-3.5" />
                      ) : (
                        <Sun className="w-3.5 h-3.5" />
                      )}
                      {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                    </button>
                    
                    {/* Sign Out */}
                    <button
                      onClick={() => {
                        signOut();
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 text-text-tertiary hover:text-accent-primary hover:bg-accent-subtle rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-bg-primary shadow-2xl transform transition-transform duration-300 ease-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-3 flex items-center justify-between border-b border-border-secondary">
            <button
              onClick={() => {
                navigate('/');
                setSidebarOpen(false);
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
              title={t('nav.goToHome')}
            >
              <img 
                src="/logo-icon.png" 
                alt="COMMIT" 
                className="w-16 h-16 object-contain"
              />
              <span className="text-sm font-bold text-text-primary">COMMIT</span>
            </button>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-text-tertiary hover:bg-bg-tertiary rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 p-3 overflow-y-auto">
            {navigationGroups.map((group) => (
              <NavigationGroup
                key={group.id}
                group={group}
                collapsed={false}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </nav>
          <div className="border-t border-border-secondary">
            {/* Collapsible User Workspace */}
            <button
              onClick={() => setMobileWorkspaceOpen(!mobileWorkspaceOpen)}
              className="w-full flex items-center justify-between p-3 hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-text-primary">My Workspace</p>
                  <p className="text-[10px] text-text-tertiary truncate max-w-[140px]">{user?.email}</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${mobileWorkspaceOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Collapsible Content */}
            {mobileWorkspaceOpen && (
              <div className="px-3 pb-3 space-y-2 animate-in slide-in-from-top-2">
                {/* Language Selector */}
                <div>
                  <div className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5 px-2">
                    {t('language.selectLanguage')}
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setLanguage('en');
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary transition-colors ${
                        language === 'en' ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {t('language.english')}
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('es');
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary transition-colors ${
                        language === 'es' ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {t('language.spanish')}
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('zh');
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary transition-colors ${
                        language === 'zh' ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-primary'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {t('language.chinese')}
                    </button>
                  </div>
                </div>
                
                {/* Theme Toggle */}
                <button
                  onClick={() => {
                    toggleTheme();
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
                >
                  {theme === 'light' ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                  {theme === 'light' ? t('common.darkMode') : t('common.lightMode')}
                </button>
                
                {/* Sign Out */}
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-28' : 'lg:pl-80'
      }`}>
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 glass-card rounded-none border-b border-border-secondary px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-text-secondary hover:bg-bg-tertiary rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-text-primary">COMMIT Journal</span>
          <div className="w-10" /> {/* Spacer for balance */}
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
          <div className="max-w-7xl xl:max-w-[90rem] 2xl:max-w-[100rem] 3xl:max-w-none mx-auto w-full animate-slide-up">
            <div className="mb-6">
              <Breadcrumbs />
            </div>
            {children}
          </div>
        </main>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      <BottomTabBar onQuickAdd={() => setQuickActionsOpen(true)} />
      <QuickActions 
        isOpen={quickActionsOpen} 
        onClose={() => setQuickActionsOpen(false)}
        onOpen={() => setQuickActionsOpen(true)}
      />
    </div>
    </>
  );
}
