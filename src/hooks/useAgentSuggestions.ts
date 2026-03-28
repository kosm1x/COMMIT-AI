/**
 * Hook for managing agent suggestions state.
 *
 * Loads pending suggestions on mount, provides accept/reject actions,
 * and tracks pending count for the badge.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
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
  processingIds: Set<string>;
  accept: (id: string) => Promise<void>;
  reject: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAgentSuggestions(): UseAgentSuggestionsReturn {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { t } = useLanguage();
  const service = useMemo(
    () => (user?.id ? createSuggestionsService(user.id) : null),
    [user?.id],
  );
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [activity, setActivity] = useState<JarvisActivity[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!service) return;
    setLoading(true);
    try {
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
  }, [service]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const accept = useCallback(
    async (id: string) => {
      if (!service || processingIds.has(id)) return;
      setProcessingIds((prev) => new Set(prev).add(id));
      try {
        const ok = await service.accept(id);
        if (ok) {
          setSuggestions((prev) => prev.filter((s) => s.id !== id));
          setPendingCount((prev) => Math.max(0, prev - 1));
          notify({
            type: "success",
            message: t("suggestions.accepted") || "Suggestion accepted",
          });
        } else {
          notify({
            type: "error",
            message:
              t("suggestions.acceptFailed") || "Failed to accept suggestion",
          });
        }
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [service, processingIds, notify, t],
  );

  const reject = useCallback(
    async (id: string) => {
      if (!service || processingIds.has(id)) return;
      setProcessingIds((prev) => new Set(prev).add(id));
      try {
        const ok = await service.reject(id);
        if (ok) {
          setSuggestions((prev) => prev.filter((s) => s.id !== id));
          setPendingCount((prev) => Math.max(0, prev - 1));
          notify({
            type: "info",
            message: t("suggestions.rejected") || "Suggestion dismissed",
          });
        } else {
          notify({
            type: "error",
            message:
              t("suggestions.rejectFailed") || "Failed to dismiss suggestion",
          });
        }
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [service, processingIds, notify, t],
  );

  return {
    suggestions,
    activity,
    pendingCount,
    loading,
    processingIds,
    accept,
    reject,
    refresh,
  };
}
