import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Sparkles, Check, X, Edit2, Loader2, AlertCircle } from 'lucide-react';
import type { SuggestedObjective } from '../../../services/aiService';

interface ObjectiveSuggestionsModalProps {
  goalTitle: string;
  suggestions: SuggestedObjective[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onCreateObjectives: (selected: SuggestedObjective[]) => Promise<void>;
  onRegenerate: () => void;
}

export default function ObjectiveSuggestionsModal({
  goalTitle,
  suggestions,
  loading,
  error,
  onClose,
  onCreateObjectives,
  onRegenerate,
}: ObjectiveSuggestionsModalProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<number | null>(null);
  const [editedSuggestions, setEditedSuggestions] = useState<SuggestedObjective[]>(suggestions);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setSelected(new Set(suggestions.map((_, i) => i)));
    setEditedSuggestions(suggestions);
  }, [suggestions]);

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelected(newSelected);
  };

  const handleEdit = (index: number, field: keyof SuggestedObjective, value: string) => {
    const updated = [...editedSuggestions];
    updated[index] = { ...updated[index], [field]: value };
    setEditedSuggestions(updated);
  };

  const handleCreate = async () => {
    const selectedObjectives = Array.from(selected)
      .sort((a, b) => a - b)
      .map((i) => editedSuggestions[i]);
    setCreating(true);
    await onCreateObjectives(selectedObjectives);
    setCreating(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-strong rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-white/20 dark:border-white/10 animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-text-primary">AI-Suggested Objectives</h2>
              <p className="text-sm text-text-secondary mt-1">
                For goal: <span className="font-medium">{goalTitle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
              <p className="text-text-secondary">Analyzing goal and generating objectives...</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-200">{error}</p>
                <button
                  onClick={onRegenerate}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline mt-1"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {!loading &&
            !error &&
            editedSuggestions.map((objective, index) => (
              <div
                key={index}
                className={`border rounded-xl p-4 transition-all ${
                  selected.has(index)
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/20'
                    : 'border-border-primary bg-bg-primary'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelection(index)}
                    className="mt-1 flex-shrink-0"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selected.has(index)
                          ? 'border-indigo-600 bg-indigo-600'
                          : 'border-border-secondary hover:border-indigo-400'
                      }`}
                    >
                      {selected.has(index) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {editing === index ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={objective.title}
                          onChange={(e) => handleEdit(index, 'title', e.target.value)}
                          className="input-modern py-1.5 px-2 text-sm w-full"
                          placeholder="Objective title"
                        />
                        <textarea
                          value={objective.description}
                          onChange={(e) => handleEdit(index, 'description', e.target.value)}
                          className="input-modern py-1.5 px-2 text-sm resize-none w-full"
                          rows={2}
                          placeholder="Description"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditing(null)}
                            className="text-xs btn-primary py-1 px-3"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-text-primary">{objective.title}</h4>
                          <button
                            onClick={() => setEditing(index)}
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 p-1"
                            title="Edit objective"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-sm text-text-secondary mb-2">{objective.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(objective.priority)}`}
                          >
                            {objective.priority}
                          </span>
                          <span className="text-xs text-text-tertiary">{objective.reasoning}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        {!loading && !error && suggestions.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <button
                onClick={onRegenerate}
                className="text-sm text-text-secondary hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Regenerate suggestions
              </button>
              <span className="text-sm text-text-tertiary">
                {selected.size} of {suggestions.length} selected
              </span>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={selected.size === 0 || creating}
                className="btn-primary bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create {selected.size} Objective{selected.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
