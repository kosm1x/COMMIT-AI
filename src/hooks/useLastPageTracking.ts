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
  const isFirstLoginRef = useRef(true);

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

  // Reset restore flag when user changes (logs out/in)
  useEffect(() => {
    if (!user) {
      hasRestoredRef.current = false;
      isFirstLoginRef.current = true;
    }
  }, [user]);

  // Restore last visited page ONLY when preferences are loaded (after DB sync)
  useEffect(() => {
    if (!user) return;
    
    const handlePreferencesLoaded = () => {
      // Only restore once per login session
      if (hasRestoredRef.current) return;
      
      // Only attempt restore when on the default page
      if (location.pathname !== '/journal' && location.pathname !== '/') {
        hasRestoredRef.current = true;
        return;
      }
      
      // Small delay to ensure localStorage is updated from DB sync
      setTimeout(() => {
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
          hasRestoredRef.current = true;
        }
      }, 100);
    };

    window.addEventListener('preferencesLoaded', handlePreferencesLoaded);
    
    // If this is the first mount and user exists, check if preferences are already loaded
    if (isFirstLoginRef.current) {
      isFirstLoginRef.current = false;
      // Trigger a check after a short delay (preferences might already be loaded)
      setTimeout(handlePreferencesLoaded, 200);
    }
    
    return () => window.removeEventListener('preferencesLoaded', handlePreferencesLoaded);
  }, [user, navigate, location.pathname]);
}
