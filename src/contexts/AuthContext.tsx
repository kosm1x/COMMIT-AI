import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { syncPreferencesOnSignIn, syncPreferencesOnSignOut } from '../services/userPreferencesService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session storage key for tracking if preferences have been loaded this session
const PREFS_LOADED_KEY = 'commit_prefs_loaded_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check if preferences were already loaded this browser session
  const getPreferencesLoadedFlag = () => {
    return sessionStorage.getItem(PREFS_LOADED_KEY) === 'true';
  };
  
  const setPreferencesLoadedFlag = (value: boolean) => {
    if (value) {
      sessionStorage.setItem(PREFS_LOADED_KEY, 'true');
    } else {
      sessionStorage.removeItem(PREFS_LOADED_KEY);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AuthContext] getSession result:', session ? 'User signed in' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check if preferences were already loaded this session
      const alreadyLoaded = getPreferencesLoadedFlag();
      console.log('[AuthContext] Preferences already loaded this session?', alreadyLoaded);
      
      // Sync preferences from DB when user signs in (non-blocking, only once per browser session)
      if (session?.user && !alreadyLoaded) {
        console.log('[AuthContext] Syncing preferences for user:', session.user.id);
        setPreferencesLoadedFlag(true);
        // Don't await - run in background to avoid blocking app loading
        syncPreferencesOnSignIn(session.user.id)
          .then(() => {
            console.log('[AuthContext] Preferences synced, dispatching event');
            window.dispatchEvent(new CustomEvent('preferencesLoaded'));
          })
          .catch((error) => {
            console.error('[AuthContext] Error syncing preferences:', error);
            // Still dispatch event so app doesn't hang waiting
            window.dispatchEvent(new CustomEvent('preferencesLoaded'));
          });
      } else if (session?.user && alreadyLoaded) {
        // If already loaded, still dispatch event so contexts can initialize from localStorage
        console.log('[AuthContext] Preferences already loaded, dispatching event for context initialization');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('preferencesLoaded'));
        }, 100);
      }
      
      // Always set loading to false, even if preference sync fails
      setLoading(false);
    }).catch((error) => {
      console.error('[AuthContext] Error getting session:', error);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthContext] Auth state changed:', _event, session ? 'User present' : 'No user');
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check if preferences were already loaded this session
      const alreadyLoaded = getPreferencesLoadedFlag();
      
      // Sync preferences when auth state changes to signed in (non-blocking, only once per browser session)
      if (session?.user && _event === 'SIGNED_IN' && !alreadyLoaded) {
        console.log('[AuthContext] User signed in, syncing preferences');
        setPreferencesLoadedFlag(true);
        // Don't await - run in background
        syncPreferencesOnSignIn(session.user.id)
          .then(() => {
            console.log('[AuthContext] Preferences synced, dispatching event');
            window.dispatchEvent(new CustomEvent('preferencesLoaded'));
          })
          .catch((error) => {
            console.error('[AuthContext] Error syncing preferences:', error);
            window.dispatchEvent(new CustomEvent('preferencesLoaded'));
          });
      }
      
      // Reset preference loading flag on sign out
      if (!session?.user && _event === 'SIGNED_OUT') {
        setPreferencesLoadedFlag(false);
      }
      
      // Always set loading to false
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    try {
      // Save current preferences to database before signing out
      if (user) {
        await syncPreferencesOnSignOut(user.id);
      }
      
      // Sign out from Supabase (this clears auth tokens from storage)
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      
      // React will automatically show login page when user becomes null
      // No page reload needed - Supabase's onAuthStateChange handles state update
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
