import { useState } from 'react';
import { Objective } from '../types';

interface TaskFormProps {
  onClose: () => void;
  onCreate: (title: string, priority: string, dueDate: string, objectiveId: string | null, isRecurring: boolean) => void;
  objectives: Objective[];
  selectedObjective: Objective | null;
}

export default function TaskForm({ onClose, onCreate, objectives, selectedObjective }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [objectiveId, setObjectiveId] = useState<string | null>(selectedObjective?.id || null);
  const [isRecurring, setIsRecurring] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(title, priority, dueDate, objectiveId, isRecurring);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-strong rounded-2xl p-6 max-w-md w-full shadow-2xl border border-white/20 dark:border-white/10 animate-scale-in">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Create Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-modern"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Objective</label>
            <select
              value={objectiveId || ''}
              onChange={(e) => setObjectiveId(e.target.value || null)}
              className="input-modern"
            >
              <option value="">No Objective (Orphaned)</option>
              {objectives.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="input-modern"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-modern"
              disabled={isRecurring}
            />
            {isRecurring && (
              <p className="text-xs text-text-tertiary mt-1">Recurring tasks don't have a due date</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="isRecurring" className="text-sm font-medium text-text-secondary cursor-pointer">
              Recurring task (e.g., daily habits)
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary bg-purple-600 hover:bg-purple-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

