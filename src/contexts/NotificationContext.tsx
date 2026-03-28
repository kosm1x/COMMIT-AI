import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { AlertTriangle, AlertCircle, CheckCircle, Info, X } from "lucide-react";

type NotificationType = "error" | "warning" | "success" | "info";

interface NotificationAction {
  label: string;
  onClick: () => void;
}

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  detail?: string;
  action?: NotificationAction;
  duration: number;
}

interface NotificationContextType {
  notify: (opts: {
    type: NotificationType;
    message: string;
    detail?: string;
    action?: NotificationAction;
    duration?: number;
  }) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 5000,
  info: 5000,
  warning: 8000,
  error: 10000,
};

const MAX_VISIBLE = 3;

const ICON_MAP: Record<NotificationType, typeof AlertTriangle> = {
  error: AlertTriangle,
  warning: AlertCircle,
  success: CheckCircle,
  info: Info,
};

const STYLE_MAP: Record<NotificationType, string> = {
  error:
    "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100",
  warning:
    "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100",
  success:
    "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100",
  info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100",
};

const ICON_COLOR_MAP: Record<NotificationType, string> = {
  error: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-green-600 dark:text-green-400",
  info: "text-blue-600 dark:text-blue-400",
};

let nextId = 0;

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    ({
      type,
      message,
      detail,
      action,
      duration,
    }: {
      type: NotificationType;
      message: string;
      detail?: string;
      action?: NotificationAction;
      duration?: number;
    }) => {
      const id = `notif-${++nextId}`;
      const dur = duration ?? DEFAULT_DURATIONS[type];

      const notification: Notification = {
        id,
        type,
        message,
        detail,
        action,
        duration: dur,
      };

      setNotifications((prev) => {
        const next = [...prev, notification];
        // Evict oldest if over limit
        if (next.length > MAX_VISIBLE) {
          const evicted = next[0];
          const timer = timersRef.current.get(evicted.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(evicted.id);
          }
          return next.slice(1);
        }
        return next;
      });

      if (dur > 0) {
        const timer = setTimeout(() => {
          timersRef.current.delete(id);
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, dur);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [],
  );

  const clearAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setNotifications([]);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, dismiss, clearAll }}>
      {children}
      {/* Toast container — fixed bottom-center, above TabBar */}
      {notifications.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-full max-w-md px-4">
          {notifications.map((n) => {
            const Icon = ICON_MAP[n.type];
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-3 rounded-lg border shadow-lg animate-in slide-in-from-bottom-2 fade-in ${STYLE_MAP[n.type]}`}
                role="alert"
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${ICON_COLOR_MAP[n.type]}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.message}</p>
                  {n.detail && (
                    <p className="text-xs mt-1 opacity-75 truncate">
                      {n.detail}
                    </p>
                  )}
                </div>
                {n.action && (
                  <button
                    onClick={() => {
                      n.action!.onClick();
                      dismiss(n.id);
                    }}
                    aria-label={n.action.label}
                    className="flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-md bg-white/80 dark:bg-white/20 hover:bg-white dark:hover:bg-white/30 transition-colors"
                  >
                    {n.action.label}
                  </button>
                )}
                <button
                  onClick={() => dismiss(n.id)}
                  className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return ctx;
}
