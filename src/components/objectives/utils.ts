import { CheckCircle2, Circle, Clock, Pause } from 'lucide-react';
import { createElement } from 'react';

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return createElement(CheckCircle2, { className: 'w-5 h-5 text-green-600' });
    case 'in_progress':
      return createElement(Clock, { className: 'w-5 h-5 text-blue-600' });
    case 'on_hold':
      return createElement(Pause, { className: 'w-5 h-5 text-yellow-600' });
    default:
      return createElement(Circle, { className: 'w-5 h-5 text-gray-400' });
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export const formatLastEdited = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return date.toLocaleDateString();
};

export const sanitizeInput = (input: string): string => {
  // Basic XSS prevention - strip HTML tags
  return input.replace(/<[^>]*>/g, '').trim();
};

export const validateTitle = (title: string): boolean => {
  const sanitized = sanitizeInput(title);
  return sanitized.length >= 1 && sanitized.length <= 500;
};

export const validateDescription = (description: string): boolean => {
  if (!description) return true; // Description is optional
  const sanitized = sanitizeInput(description);
  return sanitized.length <= 5000;
};

