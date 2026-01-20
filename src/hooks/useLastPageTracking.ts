import { useEffect } from 'react';
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

  // Track page changes
  useEffect(() => {
    if (user && location.pathname !== '/') {
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

  // Restore last visited page on sign-in (only once)
  useEffect(() => {
    let hasNavigated = false;
    
    const handlePreferencesLoaded = () => {
      // Only navigate once per session
      if (hasNavigated) return;
      
      const prefs = loadPreferencesFromLocalStorage();
      // Only navigate if we're on the default page AND last page was different
      if (prefs?.last_page_visited && 
          location.pathname === '/journal' && 
          prefs.last_page_visited !== '/journal' && 
          prefs.last_page_visited !== '/') {
        hasNavigated = true;
        setTimeout(() => {
          navigate(prefs.last_page_visited, { replace: true });
        }, 100); // Small delay to ensure contexts are ready
      }
    };

    window.addEventListener('preferencesLoaded', handlePreferencesLoaded);
    return () => window.removeEventListener('preferencesLoaded', handlePreferencesLoaded);
  }, [navigate, location.pathname]);
}
