import { Link, useLocation } from 'react-router-dom';
import type { NavigationGroup as NavigationGroupType, NavigationItem } from '../../config/navigation';

interface NavigationGroupProps {
  group: NavigationGroupType;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export default function NavigationGroup({ group, collapsed = false, onNavigate }: NavigationGroupProps) {
  const location = useLocation();

  const isItemActive = (item: NavigationItem): boolean => {
    if (location.pathname === item.path) return true;
    if (item.children?.some(child => location.pathname === child.path)) return true;
    return false;
  };

  const renderNavigationItem = (item: NavigationItem, isChild = false) => {
    const Icon = item.icon;
    const isActive = isItemActive(item);
    const hasChildren = item.children && item.children.length > 0;

    if (collapsed && isChild) return null;

    return (
      <div key={item.id}>
        <Link
          to={item.available ? item.path : '#'}
          onClick={(e) => {
            if (!item.available) {
              e.preventDefault();
            } else if (onNavigate) {
              onNavigate();
            }
          }}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-2.5 rounded-lg transition-all group ${
            isChild ? 'ml-8' : ''
          } ${
            isActive
              ? 'bg-blue-50 text-blue-600'
              : item.available
              ? 'text-gray-700 hover:bg-gray-100'
              : 'text-gray-400 cursor-not-allowed'
          }`}
          title={collapsed ? item.label : undefined}
        >
          <Icon className={`w-5 h-5 flex-shrink-0 ${isChild ? 'w-4 h-4' : ''}`} />
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium truncate ${isChild ? 'text-sm' : ''}`}>
                    {item.label}
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {!item.available && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                      Soon
                    </span>
                  )}
                </div>
                {item.description && !isChild && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>
              {item.shortcut && (
                <kbd className="hidden lg:inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.shortcut}
                </kbd>
              )}
            </>
          )}
        </Link>
        {hasChildren && isActive && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavigationItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {!collapsed && (
        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {group.label}
        </div>
      )}
      <div className="mt-1 space-y-1">
        {group.items.map(item => renderNavigationItem(item))}
      </div>
    </div>
  );
}
