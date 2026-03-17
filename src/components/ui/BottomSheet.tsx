import { useEffect, useCallback, ReactNode } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  height?: "auto" | "half" | "full";
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = "auto",
}: BottomSheetProps) {
  const trapRef = useFocusTrap(isOpen);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const heights = {
    auto: "max-h-[85vh]",
    half: "h-[50vh]",
    full: "h-[95vh]",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        ref={trapRef}
        className={`
          relative w-full lg:max-w-lg ${heights[height]}
          bg-white dark:bg-gray-900
          rounded-t-3xl lg:rounded-2xl
          shadow-2xl
          animate-in slide-in-from-bottom duration-300 lg:zoom-in-95 lg:fade-in lg:slide-in-from-bottom-0
          overflow-hidden flex flex-col
        `}
      >
        <div className="flex items-center justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 pb-8">{children}</div>
      </div>
    </div>
  );
}
