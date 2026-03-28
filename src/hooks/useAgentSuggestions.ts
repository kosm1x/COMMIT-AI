/**
 * Hook for managing agent suggestions state.
 *
 * Loads pending suggestions on mount, provides accept/reject actions,
 * and tracks pending count for the badge.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { useLanguage } from "../contexts/LanguageContext";
import { createSuggestionsService } from "../services/suggestionsService";
import type { AgentSuggestion } from "../services/suggestionsService";

interface JarvisActivity {
  table: string;
  id: string;
  title: string;
  modified_at: string;
}

export interface UseAgentSuggestionsReturn {
  suggestions: AgentSuggestion[];
  activity: JarvisActivity[];
  pendingCount: number;
  loading: boolean;
  accept: (id: string) => Promise<void>;
  reject: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAgentSuggestions(): UseAgentSuggestionsReturn {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [activity, setActivity] = useState<JarvisActivity[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const service = createSuggestionsService(user.id);
      const [pending, count, jarvisActivity] = await Promise.all([
        service.loadPending(),
        service.getPendingCount(),
        service.loadJarvisActivity(),
      ]);
      setSuggestions(pending);
      setPendingCount(count);
      setActivity(jarvisActivity);
    } catch (err) {
      console.error("[useAgentSuggestions] refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const accept = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      const service = createSuggestionsService(user.id);
      const ok = await service.accept(id);
      if (ok) {
        notify({
          type: "success",
          message: t("suggestions.accepted") || "Suggestion accepted",
        });
        await refresh();
      } else {
        notify({
          type: "error",
          message:
            t("suggestions.acceptFailed") || "Failed to accept suggestion",
        });
      }
    },
    [user?.id, notify, t, refresh],
  );

  const reject = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      const service = createSuggestionsService(user.id);
      const ok = await service.reject(id);
      if (ok) {
        notify({
          type: "info",
          message: t("suggestions.rejected") || "Suggestion dismissed",
        });
        await refresh();
      } else {
        notify({
          type: "error",
          message:
            t("suggestions.rejectFailed") || "Failed to dismiss suggestion",
        });
      }
    },
    [user?.id, notify, t, refresh],
  );

  return {
    suggestions,
    activity,
    pendingCount,
    loading,
    accept,
    reject,
    refresh,
  };
}
