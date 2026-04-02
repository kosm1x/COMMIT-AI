import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  scheduleAll,
  cancelAll,
  setupDeepLinkListener,
  requestPermission,
} from "../services/notificationScheduler";
import { loadNotificationPrefs } from "../services/userPreferencesService";
import { useOnboarding } from "./useOnboarding";
import { logger } from "../utils/logger";

/**
 * React hook that manages notification scheduling lifecycle.
 * - Schedules notifications after sign-in (if onboarding day >= 3)
 * - Reschedules when preferences change (via custom event)
 * - Cancels on sign-out
 * - Handles deep link navigation from notification taps
 */
export function useNotificationScheduler() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const onboarding = useOnboarding();
  const cleanupRef = useRef<(() => void) | null>(null);
  const scheduledRef = useRef(false);

  // Schedule notifications after sign-in
  useEffect(() => {
    if (!user || scheduledRef.current) return;

    // Don't prompt until onboarding day >= 3
    if (onboarding.isActive && onboarding.day < 3) return;

    const init = async () => {
      try {
        const prefs = await loadNotificationPrefs(user.id);
        await scheduleAll(prefs);
        scheduledRef.current = true;

        // Set up deep link listener
        const cleanup = await setupDeepLinkListener(navigate);
        cleanupRef.current = cleanup;
      } catch (error) {
        logger.error("[NotificationScheduler] Init failed:", error);
      }
    };

    init();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [user, navigate, onboarding.isActive, onboarding.day]);

  // Reschedule when preferences change (dispatched from Settings page)
  useEffect(() => {
    if (!user) return;

    const handler = async (e: Event) => {
      const prefs = (e as CustomEvent).detail;
      if (prefs) {
        await scheduleAll(prefs);
        logger.info("[NotificationScheduler] Rescheduled after pref change");
      }
    };

    window.addEventListener("notificationPrefsChanged", handler);
    return () =>
      window.removeEventListener("notificationPrefsChanged", handler);
  }, [user]);

  // Cancel on sign-out
  useEffect(() => {
    if (!user && scheduledRef.current) {
      cancelAll();
      scheduledRef.current = false;
    }
  }, [user]);

  return { requestPermission };
}
