import { useState } from 'react';
import { Vision } from '../types';

interface GoalFormProps {
  onClose: () => void;
  onCreate: (title: string, description: string, targetDate: string, visionId: string | null) => void;
  visions: Vision[];
  selectedVision: Vision | null;
}

export default function GoalForm({ onClose, onCreate, visions, selectedVision }: GoalFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [visionId, setVisionId] = useState<string | null>(selectedVision?.id || null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(title, description, targetDate, visionId);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-strong rounded-2xl p-6 max-w-md w-full shadow-2xl border border-white/20 dark:border-white/10 animate-scale-in">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Create Goal</h2>
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
            <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-modern resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Vision</label>
            <select
              value={visionId || ''}
              onChange={(e) => setVisionId(e.target.value || null)}
              className="input-modern"
            >
              <option value="">No Vision (Orphaned)</option>
              {visions.map((vision) => (
                <option key={vision.id} value={vision.id}>
                  {vision.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Target Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="input-modern"
            />
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
              className="flex-1 btn-primary bg-blue-600 hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

