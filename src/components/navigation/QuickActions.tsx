import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  X,
  BookOpen,
  Target,
  ListChecks,
  Flag,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  onClick: () => void;
}

interface QuickActionsProps {
  onCreateJournalEntry?: () => void;
  onCreateGoal?: () => void;
  onCreateObjective?: () => void;
  onCreateTask?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

export default function QuickActions({
  onCreateJournalEntry,
  onCreateGoal,
  onCreateObjective,
  onCreateTask,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onOpen: controlledOnOpen,
}: QuickActionsProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = useCallback(() => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  }, [controlledOnClose]);

  const handleOpen = useCallback(() => {
    if (controlledOnOpen) {
      controlledOnOpen();
    } else {
      setInternalIsOpen(true);
    }
  }, [controlledOnOpen]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [isOpen, handleClose, handleOpen]);
  const menuRef = useRef<HTMLDivElement>(null);

  const actions: QuickAction[] = [
    {
      id: "journal",
      label: "New Journal Entry",
      icon: BookOpen,
      description: "Start writing",
      onClick: () => {
        onCreateJournalEntry?.();
        handleClose();
      },
    },
    {
      id: "goal",
      label: "New Goal",
      icon: Flag,
      description: "Set a long-term goal",
      onClick: () => {
        onCreateGoal?.();
        handleClose();
      },
    },
    {
      id: "objective",
      label: "New Objective",
      icon: Target,
      description: "Add a milestone",
      onClick: () => {
        onCreateObjective?.();
        handleClose();
      },
    },
    {
      id: "task",
      label: "New Task",
      icon: ListChecks,
      description: "Create an action item",
      onClick: () => {
        onCreateTask?.();
        handleClose();
      },
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  return (
    <div ref={menuRef} className="fixed bottom-20 right-6 lg:bottom-6 z-40">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden mb-2 animate-in slide-in-from-bottom-2">
          <div className="p-2 space-y-1">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      {action.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {action.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {controlledIsOpen === undefined && (
        <button
          onClick={handleToggle}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
            isOpen
              ? "bg-gray-900 hover:bg-gray-800 rotate-45"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </button>
      )}
    </div>
  );
}
