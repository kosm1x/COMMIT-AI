import { Link2, Loader2 } from "lucide-react";
import type { Connection } from "./types";

interface ConnectionsSidebarProps {
  connections: Connection[];
  loadingConnections: boolean;
  onConnectionClick: (connectedId: string) => void;
  t: (key: string) => string;
}

export default function ConnectionsSidebar({
  connections,
  loadingConnections,
  onConnectionClick,
  t,
}: ConnectionsSidebarProps) {
  return (
    <div className="glass-card border-border-primary p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-text-secondary" />
          <h3 className="font-semibold text-text-primary">
            {t("ideaDetail.connections")}
          </h3>
        </div>
        {loadingConnections && (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>

      {connections.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          {t("ideaDetail.noConnections")}
        </p>
      ) : (
        <div className="space-y-3">
          {connections.map((conn) => (
            <button
              key={conn.ideaId}
              onClick={() => onConnectionClick(conn.ideaId)}
              className="w-full text-left p-3 bg-bg-secondary rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-text-primary text-sm">
                  {conn.ideaTitle}
                </h4>
                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded font-medium capitalize">
                  {conn.connectionType}
                </span>
              </div>
              <p className="text-xs text-text-secondary">{conn.reason}</p>
              <div className="mt-2 h-1 bg-border-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${conn.strength}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
