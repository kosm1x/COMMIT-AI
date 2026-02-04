import { NavLink } from 'react-router-dom';
import { BookOpen, Flag, LayoutGrid, Lightbulb, TrendingUp, User, type LucideIcon } from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const tabs: TabItem[] = [
  { id: 'journal', label: 'Journal', icon: BookOpen, path: '/journal' },
  { id: 'goals', label: 'Goals', icon: Flag, path: '/goals' },
  { id: 'boards', label: 'Map', icon: LayoutGrid, path: '/boards' },
  { id: 'ideate', label: 'Ideate', icon: Lightbulb, path: '/ideate' },
  { id: 'track', label: 'Track', icon: TrendingUp, path: '/track' },
];

interface TabBarProps {
  translations?: Record<string, string>;
  onSettingsClick?: () => void;
}

export default function TabBar({ translations, onSettingsClick }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const label = translations?.[tab.id] || tab.label;
          
          return (
            <NavLink
              key={tab.id}
              to={tab.path}
              className={({ isActive }) => `
                flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] rounded-xl transition-all duration-200
                ${isActive 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/30' : ''}`}>
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
        
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] rounded-xl transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <div className="p-1.5 rounded-xl">
              <User className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="text-[10px] font-medium">
              {translations?.settings || 'Me'}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
