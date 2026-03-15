import { Lightbulb, CheckSquare, Network } from "lucide-react";

interface SelectionMenuProps {
  selectionMenu: { text: string; x: number; y: number };
  onConvertToIdea: () => void;
  onConvertToTask: () => void;
  onConvertToMindMap: () => void;
  t: (key: string) => string;
}

export default function SelectionMenu({
  selectionMenu,
  onConvertToIdea,
  onConvertToTask,
  onConvertToMindMap,
  t,
}: SelectionMenuProps) {
  return (
    <div
      className="absolute z-50 bg-bg-primary border border-border-primary rounded-lg shadow-xl p-2 flex gap-2 animate-in fade-in slide-in-from-bottom-2"
      style={{
        left: `${selectionMenu.x}%`,
        top: `${Math.max(8, selectionMenu.y - 40)}px`,
        transform: "translateX(-50%)",
      }}
    >
      <button
        onClick={onConvertToIdea}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors"
        title={t("ideaDetail.convertToIdea")}
      >
        <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        {t("ideate.newIdea")}
      </button>
      <button
        onClick={onConvertToTask}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-green-50 dark:hover:bg-green-950/30 rounded transition-colors"
        title={t("ideaDetail.convertToTask")}
      >
        <CheckSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
        {t("objectives.task")}
      </button>
      <button
        onClick={onConvertToMindMap}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded transition-colors"
        title={t("ideaDetail.convertToMindMap")}
      >
        <Network className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
        {t("map.mindMap")}
      </button>
    </div>
  );
}
