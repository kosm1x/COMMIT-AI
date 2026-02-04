import { ReactNode } from 'react';
import { Settings, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import IconButton from './IconButton';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: ReactNode;
  onSettingsClick?: () => void;
}

export default function Header({ 
  title, 
  subtitle,
  showBack = false,
  rightAction,
  onSettingsClick 
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
      <div className="flex items-center justify-between h-14 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <IconButton onClick={() => navigate(-1)} size="sm">
              <ChevronLeft className="w-5 h-5" />
            </IconButton>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {rightAction}
          {onSettingsClick && (
            <IconButton onClick={onSettingsClick}>
              <Settings className="w-5 h-5" />
            </IconButton>
          )}
        </div>
      </div>
    </header>
  );
}
