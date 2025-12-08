import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Target, LayoutGrid, Network, Plus } from 'lucide-react';

const mobileNavItems = [
  { id: 'journal', label: 'Journal', icon: BookOpen, path: '/journal' },
  { id: 'objectives', label: 'Objectives', icon: Target, path: '/objectives' },
  { id: 'boards', label: 'Boards', icon: LayoutGrid, path: '/boards' },
  { id: 'mindmap', label: 'Map', icon: Network, path: '/mindmap' },
];

interface BottomTabBarProps {
  onQuickAdd?: () => void;
}

export default function BottomTabBar({ onQuickAdd }: BottomTabBarProps) {
  const location = useLocation();

  const handleQuickAdd = () => {
    if (onQuickAdd) {
      onQuickAdd();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 lg:hidden z-40 backdrop-blur-sm">
      <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom bg-white/95 dark:bg-gray-900/95">
        {mobileNavItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          (item.path === '/objectives' && ['/vision', '/goals', '/tasks'].includes(location.pathname));
          const isMiddle = index === Math.floor(mobileNavItems.length / 2);

          if (isMiddle) {
            return (
              <div key="quick-add" className="flex flex-col items-center justify-center">
                <button
                  onClick={handleQuickAdd}
                  className="w-14 h-14 -mt-6 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors active:scale-95"
                  aria-label="Quick add"
                  type="button"
                >
                  <Plus className="w-6 h-6 text-white" />
                </button>
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex flex-col items-center justify-center min-w-[60px] py-2 px-3 rounded-lg transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
