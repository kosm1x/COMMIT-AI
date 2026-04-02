import { isNative } from "./nativePlatformService";
import { supabase } from "../lib/supabase";
import { logger } from "../utils/logger";
import type { NotificationPreferences } from "./userPreferencesService";

// Notification IDs — stable so we can cancel/reschedule
const JOURNAL_REMINDER_ID = 1001;
const STREAK_ALERT_ID = 1002;
const TASK_DUE_BASE_ID = 2000; // 2001, 2002, ... per task

interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
  extra?: Record<string, string>;
}

// ─── Platform Abstraction ───────────────────────────────────────────

let LocalNotifications:
  | typeof import("@capacitor/local-notifications").LocalNotifications
  | null = null;

async function loadCapacitorPlugin() {
  if (isNative && !LocalNotifications) {
    const mod = await import("@capacitor/local-notifications");
    LocalNotifications = mod.LocalNotifications;
  }
}

// ─── Permission ─────────────────────────────────────────────────────

export async function requestPermission(): Promise<boolean> {
  if (isNative) {
    await loadCapacitorPlugin();
    if (!LocalNotifications) return false;
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  }

  // Web: Notification API
  if (typeof Notification !== "undefined") {
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  return false;
}

export async function isPermissionGranted(): Promise<boolean> {
  if (isNative) {
    await loadCapacitorPlugin();
    if (!LocalNotifications) return false;
    const result = await LocalNotifications.checkPermissions();
    return result.display === "granted";
  }

  if (typeof Notification !== "undefined") {
    return Notification.permission === "granted";
  }

  return false;
}

// ─── Scheduling ─────────────────────────────────────────────────────

async function scheduleNative(notifications: ScheduledNotification[]) {
  await loadCapacitorPlugin();
  if (!LocalNotifications || notifications.length === 0) return;

  await LocalNotifications.schedule({
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      schedule: { at: n.scheduleAt, allowWhileIdle: true },
      extra: n.extra ?? {},
      smallIcon: "ic_notification",
      largeIcon: "ic_notification",
    })),
  });
}

// Web: in-tab notification check interval
let webCheckInterval: ReturnType<typeof setInterval> | null = null;
let webScheduledNotifications: ScheduledNotification[] = [];

function startWebChecker() {
  if (webCheckInterval) return;

  webCheckInterval = setInterval(() => {
    const now = Date.now();
    const due = webScheduledNotifications.filter(
      (n) => n.scheduleAt.getTime() <= now,
    );
    for (const n of due) {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification(n.title, {
          body: n.body,
          icon: "/logo-icon.png",
          data: n.extra,
        });
      }
    }
    // Remove fired notifications
    webScheduledNotifications = webScheduledNotifications.filter(
      (n) => n.scheduleAt.getTime() > now,
    );
  }, 60_000); // Check every minute
}

function stopWebChecker() {
  if (webCheckInterval) {
    clearInterval(webCheckInterval);
    webCheckInterval = null;
  }
  webScheduledNotifications = [];
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAll(): Promise<void> {
  if (isNative) {
    await loadCapacitorPlugin();
    if (LocalNotifications) {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
    }
  }
  stopWebChecker();
  logger.info("[Notifications] All scheduled notifications cancelled");
}

/**
 * Cancel only today's streak alert (called when user saves a journal entry).
 */
export async function cancelStreakAlert(): Promise<void> {
  if (isNative) {
    await loadCapacitorPlugin();
    if (LocalNotifications) {
      await LocalNotifications.cancel({
        notifications: [{ id: STREAK_ALERT_ID }],
      });
    }
  }
  webScheduledNotifications = webScheduledNotifications.filter(
    (n) => n.id !== STREAK_ALERT_ID,
  );
  logger.info("[Notifications] Streak alert cancelled for today");
}

/**
 * Schedule all notifications based on user preferences.
 * Call on sign-in and when preferences change.
 */
export async function scheduleAll(
  prefs: NotificationPreferences,
): Promise<void> {
  const permitted = await isPermissionGranted();
  if (!permitted) {
    logger.info("[Notifications] Permission not granted, skipping schedule");
    return;
  }

  await cancelAll();

  const notifications: ScheduledNotification[] = [];
  const now = new Date();
  const tz = prefs.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Journal reminder — daily at reminder_hour
  if (prefs.notify_journal_reminder) {
    const reminderTime = getNextOccurrence(prefs.reminder_hour, tz);
    notifications.push({
      id: JOURNAL_REMINDER_ID,
      title: "Time to reflect",
      body: "How was your day? Take a moment to write.",
      scheduleAt: reminderTime,
      extra: { page: "/journal" },
    });
  }

  // Streak alert — 2 hours before reminder
  if (prefs.notify_streak_alert) {
    const alertHour = (prefs.reminder_hour - 2 + 24) % 24;
    const alertTime = getNextOccurrence(alertHour, tz);
    notifications.push({
      id: STREAK_ALERT_ID,
      title: "Keep your streak!",
      body: "Don't break your journal streak!",
      scheduleAt: alertTime,
      extra: { page: "/journal" },
    });
  }

  // Task due — query tasks due in next 7 days, schedule 9am morning-of
  if (prefs.notify_task_due) {
    try {
      const weekFromNow = new Date(now);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, due_date")
        .not("due_date", "is", null)
        .gte("due_date", now.toISOString().split("T")[0])
        .lte("due_date", weekFromNow.toISOString().split("T")[0])
        .neq("status", "completed");

      if (tasks) {
        // Group by due date
        const byDate = new Map<string, number>();
        for (const task of tasks) {
          const date = task.due_date as string;
          byDate.set(date, (byDate.get(date) ?? 0) + 1);
        }

        let idx = 0;
        for (const [dateStr, count] of byDate.entries()) {
          const dueDate = new Date(`${dateStr}T09:00:00`);
          if (dueDate > now) {
            notifications.push({
              id: TASK_DUE_BASE_ID + idx,
              title: "Tasks due today",
              body: `You have ${count} task${count > 1 ? "s" : ""} due today.`,
              scheduleAt: dueDate,
              extra: { page: "/objectives" },
            });
            idx++;
          }
        }
      }
    } catch (error) {
      logger.error(
        "[Notifications] Failed to query tasks for scheduling:",
        error,
      );
    }
  }

  if (notifications.length === 0) return;

  if (isNative) {
    await scheduleNative(notifications);
  } else {
    webScheduledNotifications = notifications;
    startWebChecker();
  }

  logger.info(
    `[Notifications] Scheduled ${notifications.length} notifications`,
  );
}

/**
 * Set up deep link listener for notification taps.
 * Returns cleanup function.
 */
export async function setupDeepLinkListener(
  navigate: (path: string) => void,
): Promise<() => void> {
  if (isNative) {
    await loadCapacitorPlugin();
    if (LocalNotifications) {
      const listener = await LocalNotifications.addListener(
        "localNotificationActionPerformed",
        (action) => {
          const page = action.notification.extra?.page;
          if (page) navigate(page);
        },
      );
      return () => listener.remove();
    }
  }
  return () => {};
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Get the next occurrence of a given hour in the user's timezone.
 * If that hour has already passed today, returns tomorrow at that hour.
 */
function getNextOccurrence(hour: number, _tz: string): Date {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}
