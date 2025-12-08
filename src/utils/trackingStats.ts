export interface StatusCount {
  not_started: number;
  in_progress: number;
  completed: number;
  on_hold: number;
  total: number;
}

export interface CompletionStats {
  completed: number;
  total: number;
  percentage: number;
}

export function calculateStatusCounts(items: Array<{ status: string }>): StatusCount {
  const counts = {
    not_started: 0,
    in_progress: 0,
    completed: 0,
    on_hold: 0,
    total: items.length,
  };

  items.forEach((item) => {
    if (item.status in counts) {
      counts[item.status as keyof Omit<StatusCount, 'total'>]++;
    }
  });

  return counts;
}

export function calculateCompletionPercentage(
  completed: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function getCompletionStats(items: Array<{ status: string }>): CompletionStats {
  const completed = items.filter((item) => item.status === 'completed').length;
  const total = items.length;
  const percentage = calculateCompletionPercentage(completed, total);

  return { completed, total, percentage };
}

export function filterByDateRange(
  items: Array<{ created_at: string }>,
  startDate: Date,
  endDate: Date
): Array<{ created_at: string }> {
  return items.filter((item) => {
    const itemDate = new Date(item.created_at);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

export function filterCompletedInRange(
  items: Array<{ completed_at: string | null }>,
  startDate: Date,
  endDate: Date
): Array<{ completed_at: string | null }> {
  return items.filter((item) => {
    if (!item.completed_at) return false;
    const completedDate = new Date(item.completed_at);
    return completedDate >= startDate && completedDate <= endDate;
  });
}

export function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getEndOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day;
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getEndOfWeek(date: Date): Date {
  const end = new Date(date);
  const day = end.getDay();
  const diff = end.getDate() + (6 - day);
  end.setDate(diff);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getStartOfMonth(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getEndOfMonth(date: Date): Date {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}
