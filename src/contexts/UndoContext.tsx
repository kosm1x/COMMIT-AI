/**
 * Undo context — manages a stack of reversible actions.
 *
 * Closure-based: each undo entry captures its revert function as a closure
 * over the previous state. Max 10 entries. Supports Ctrl+Z / Cmd+Z.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useNotification } from "./NotificationContext";
import { useLanguage } from "./LanguageContext";

interface UndoEntry {
  id: string;
  label: string;
  undo: () => Promise<boolean>;
  timestamp: number;
}

interface UndoContextType {
  pushUndo: (label: string, undoFn: () => Promise<boolean>) => void;
  undo: () => Promise<void>;
  canUndo: boolean;
}

const UndoContext = createContext<UndoContextType | null>(null);

const MAX_STACK = 10;
let nextUndoId = 0;

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<UndoEntry[]>([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const { notify } = useNotification();
  const { t } = useLanguage();

  // undo reads from ref to avoid stale closures in toast callbacks
  const undo = useCallback(async () => {
    const current = stackRef.current;
    const entry = current[current.length - 1];
    if (!entry) return;

    setStack((prev) => prev.slice(0, -1));

    const ok = await entry.undo();
    if (ok) {
      notify({
        type: "success",
        message: t("undo.undone") || "Action undone",
        duration: 3000,
      });
    } else {
      notify({
        type: "error",
        message: t("undo.failed") || "Undo failed",
      });
    }
  }, [notify, t]);

  // pushUndo is now stable (doesn't depend on stack or undo identity)
  const pushUndo = useCallback(
    (label: string, undoFn: () => Promise<boolean>) => {
      const id = `undo-${++nextUndoId}`;
      setStack((prev) => {
        const next = [
          ...prev,
          { id, label, undo: undoFn, timestamp: Date.now() },
        ];
        return next.length > MAX_STACK ? next.slice(-MAX_STACK) : next;
      });

      notify({
        type: "info",
        message: label,
        action: { label: t("undo.undo") || "Undo", onClick: () => undo() },
        duration: 8000,
      });
    },
    [notify, t, undo],
  );

  // Ctrl+Z / Cmd+Z keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;

        if (stackRef.current.length > 0) {
          e.preventDefault();
          undo();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo]);

  return (
    <UndoContext.Provider value={{ pushUndo, undo, canUndo: stack.length > 0 }}>
      {children}
    </UndoContext.Provider>
  );
}

export function useUndo(): UndoContextType {
  const ctx = useContext(UndoContext);
  if (!ctx) {
    throw new Error("useUndo must be used within UndoProvider");
  }
  return ctx;
}
