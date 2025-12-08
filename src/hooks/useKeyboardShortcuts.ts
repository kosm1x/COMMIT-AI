import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { flatNavigationItems } from '../config/navigation';

interface UseKeyboardShortcutsProps {
  onOpenCommandPalette?: () => void;
}

export function useKeyboardShortcuts({ onOpenCommandPalette }: UseKeyboardShortcutsProps = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (modifierKey && e.key === 'k') {
        e.preventDefault();
        onOpenCommandPalette?.();
        return;
      }

      if (modifierKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        onOpenCommandPalette?.();
        return;
      }

      if (modifierKey && !e.shiftKey && !e.altKey) {
        const item = flatNavigationItems.find(
          item => item.shortcut === e.key && item.available
        );

        if (item) {
          e.preventDefault();
          navigate(item.path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onOpenCommandPalette]);
}
