import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { savePreferencesToLocalStorage, savePreferencesToDB, loadPreferencesFromLocalStorage } from '../services/userPreferencesService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to track the last visited page and restore it on sign-in
 * 
 * CRITICAL: The restore must complete BEFORE saves are allowed,
 * otherwise the save effect will overwrite the DB-synced value.
 */
export function useLastPageTracking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const hasRestoredRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  // Detect user transitions and reset flags appropriately
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const previousUserId = prevUserIdRef.current;
    
    if (currentUserId !== previousUserId) {
      hasRestoredRef.current = false;
      prevUserIdRef.current = currentUserId;
    }
  }, [user]);

  // Restore last visited page when preferences are loaded
  useEffect(() => {
    if (!user) return;
    
    const handlePreferencesLoaded = () => {
      if (hasRestoredRef.current) return;
      
      if (location.pathname !== '/journal' && location.pathname !== '/') {
        hasRestoredRef.current = true;
        return;
      }
      
      const prefs = loadPreferencesFromLocalStorage();
      const lastPage = prefs?.last_page_visited;
      
      if (lastPage && 
          lastPage !== '/journal' && 
          lastPage !== '/' && 
          lastPage !== location.pathname) {
        hasRestoredRef.current = true;
        navigate(lastPage, { replace: true });
      } else {
        hasRestoredRef.current = true;
      }
    };

    window.addEventListener('preferencesLoaded', handlePreferencesLoaded);
    
    const timeoutId = setTimeout(() => {
      if (!hasRestoredRef.current) {
        handlePreferencesLoaded();
      }
    }, 150);
    
    return () => {
      window.removeEventListener('preferencesLoaded', handlePreferencesLoaded);
      clearTimeout(timeoutId);
    };
  }, [user, navigate, location.pathname]);

  // Save current page (only after restore completes)
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    if (!user) return;
    if (location.pathname === '/' || location.pathname === '/reset-password') return;
    
    const pagePath = location.pathname;
    savePreferencesToLocalStorage({ last_page_visited: pagePath });

    const timeoutId = setTimeout(() => {
      savePreferencesToDB(user.id, { last_page_visited: pagePath });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, user]);
}
