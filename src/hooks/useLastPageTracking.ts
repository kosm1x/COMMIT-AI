import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { savePreferencesToLocalStorage, savePreferencesToDB, loadPreferencesFromLocalStorage } from '../services/userPreferencesService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to track the last visited page and restore it on sign-in
 */
export function useLastPageTracking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasRestoredRef = useRef(false);

  // Track page changes - save current page when navigating
  useEffect(() => {
    if (user && location.pathname !== '/' && location.pathname !== '/reset-password') {
      const pagePath = location.pathname;
      
      // Save to localStorage immediately
      savePreferencesToLocalStorage({ last_page_visited: pagePath });

      // Debounce database saves to avoid too many writes
      const timeoutId = setTimeout(() => {
        savePreferencesToDB(user.id, { last_page_visited: pagePath });
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname, user]);

  // Restore last visited page on initial load
  useEffect(() => {
    // Only restore once per session
    if (hasRestoredRef.current) return;
    
    // Only attempt restore when we have a user and we're on the default page
    if (!user) return;
    if (location.pathname !== '/journal' && location.pathname !== '/') return;
    
    const restoreLastPage = () => {
      if (hasRestoredRef.current) return;
      
      const prefs = loadPreferencesFromLocalStorage();
      const lastPage = prefs?.last_page_visited;
      
      // Navigate if we have a valid last page that's different from current
      if (lastPage && 
          lastPage !== '/journal' && 
          lastPage !== '/' && 
          lastPage !== location.pathname) {
        hasRestoredRef.current = true;
        navigate(lastPage, { replace: true });
      } else {
        // Mark as restored even if no navigation needed, to prevent repeated checks
        hasRestoredRef.current = true;
      }
    };

    // Try to restore immediately (preferences might already be loaded)
    restoreLastPage();
    
    // Also listen for the preferencesLoaded event in case it fires later
    const handlePreferencesLoaded = () => {
      setTimeout(restoreLastPage, 50);
    };

    window.addEventListener('preferencesLoaded', handlePreferencesLoaded);
    return () => window.removeEventListener('preferencesLoaded', handlePreferencesLoaded);
  }, [navigate, location.pathname, user]);
}
