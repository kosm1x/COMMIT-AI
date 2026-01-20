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
  
  // Track whether restore has been attempted (gates save operations)
  const hasRestoredRef = useRef(false);
  // Track if this is a fresh login (preferences not yet loaded)
  const isNewLoginRef = useRef(true);

  // Reset flags when user logs out
  useEffect(() => {
    if (!user) {
      console.log('[LastPageTracking] User logged out, resetting flags');
      hasRestoredRef.current = false;
      isNewLoginRef.current = true;
    }
  }, [user]);

  // RESTORE EFFECT: Must run BEFORE save effect can write
  // Listens for preferencesLoaded event and navigates to last page
  useEffect(() => {
    if (!user) return;
    
    const handlePreferencesLoaded = () => {
      console.log('[LastPageTracking] preferencesLoaded event received', {
        hasRestored: hasRestoredRef.current,
        pathname: location.pathname,
        isNewLogin: isNewLoginRef.current
      });
      
      // Only restore once per login
      if (hasRestoredRef.current) {
        console.log('[LastPageTracking] Already restored, skipping');
        return;
      }
      
      // Only attempt restore when on the default entry pages
      if (location.pathname !== '/journal' && location.pathname !== '/') {
        console.log('[LastPageTracking] Not on default page, marking as restored');
        hasRestoredRef.current = true;
        return;
      }
      
      // Read the last page from localStorage (which was updated by DB sync)
      const prefs = loadPreferencesFromLocalStorage();
      const lastPage = prefs?.last_page_visited;
      
      console.log('[LastPageTracking] Checking restore', { lastPage, currentPath: location.pathname });
      
      // Navigate if we have a valid last page different from current
      if (lastPage && 
          lastPage !== '/journal' && 
          lastPage !== '/' && 
          lastPage !== location.pathname) {
        console.log('[LastPageTracking] NAVIGATING to:', lastPage);
        hasRestoredRef.current = true;
        isNewLoginRef.current = false;
        navigate(lastPage, { replace: true });
      } else {
        console.log('[LastPageTracking] No navigation needed, marking as restored');
        hasRestoredRef.current = true;
        isNewLoginRef.current = false;
      }
    };

    // Listen for the preferencesLoaded event
    window.addEventListener('preferencesLoaded', handlePreferencesLoaded);
    
    // Also check immediately in case preferences were already loaded
    // Use a small delay to ensure the event listener is registered first
    const timeoutId = setTimeout(() => {
      if (!hasRestoredRef.current && isNewLoginRef.current) {
        console.log('[LastPageTracking] Checking if preferences already loaded...');
        handlePreferencesLoaded();
      }
    }, 150);
    
    return () => {
      window.removeEventListener('preferencesLoaded', handlePreferencesLoaded);
      clearTimeout(timeoutId);
    };
  }, [user, navigate, location.pathname]);

  // SAVE EFFECT: Track page changes, but ONLY after restore has completed
  // This prevents overwriting the DB-synced value before restore can use it
  useEffect(() => {
    // CRITICAL: Do not save until restore has completed
    if (!hasRestoredRef.current) {
      console.log('[LastPageTracking] Save blocked - restore not yet complete');
      return;
    }
    
    if (!user) return;
    if (location.pathname === '/' || location.pathname === '/reset-password') return;
    
    const pagePath = location.pathname;
    console.log('[LastPageTracking] Saving current page:', pagePath);
    
    // Save to localStorage immediately
    savePreferencesToLocalStorage({ last_page_visited: pagePath });

    // Debounce database saves
    const timeoutId = setTimeout(() => {
      savePreferencesToDB(user.id, { last_page_visited: pagePath });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, user]);
}
