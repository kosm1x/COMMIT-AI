import {
  BookOpen,
  LayoutGrid,
  Network,
  Lightbulb,
  TrendingUp,
  Flag,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  path: string;
  available: boolean;
  children?: NavigationItem[];
  badge?: number;
  shortcut?: string;
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
  collapsible: boolean;
  defaultExpanded: boolean;
}

export const navigationGroups: NavigationGroup[] = [
  {
    id: 'context',
    label: 'Context',
    collapsible: false,
    defaultExpanded: true,
    items: [
      {
        id: 'journal',
        label: 'Journal',
        description: 'Daily reflections and thoughts',
        icon: BookOpen,
        path: '/journal',
        available: true,
        shortcut: '1',
      },
    ],
  },
  {
    id: 'objectives-tasks',
    label: 'Objectives and Tasks',
    collapsible: false,
    defaultExpanded: true,
    items: [
      {
        id: 'goals',
        label: 'Goals',
        description: 'Long-term aspirations',
        icon: Flag,
        path: '/goals',
        available: true,
        shortcut: '2',
      },
    ],
  },
  {
    id: 'maps',
    label: 'Maps',
    collapsible: false,
    defaultExpanded: true,
    items: [
      {
        id: 'boards',
        label: 'Kanban Boards',
        description: 'Visual workflow management',
        icon: LayoutGrid,
        path: '/boards',
        available: true,
        shortcut: '3',
      },
      {
        id: 'mindmap',
        label: 'Mind Map',
        description: 'Visual idea connections',
        icon: Network,
        path: '/mindmap',
        available: true,
        shortcut: '4',
      },
    ],
  },
  {
    id: 'ideation',
    label: 'Ideation',
    collapsible: false,
    defaultExpanded: true,
    items: [
      {
        id: 'ideate',
        label: 'Ideate',
        description: 'Brainstorm and explore ideas',
        icon: Lightbulb,
        path: '/ideate',
        available: true,
        shortcut: '5',
      },
    ],
  },
  {
    id: 'tracking',
    label: 'Tracking',
    collapsible: false,
    defaultExpanded: true,
    items: [
      {
        id: 'track',
        label: 'Progress Tracking',
        description: 'Monitor your growth',
        icon: TrendingUp,
        path: '/track',
        available: true,
        shortcut: '6',
      },
    ],
  },
];

export const flatNavigationItems = navigationGroups.flatMap(group =>
  group.items.flatMap(item => [item, ...(item.children || [])])
);

export const getNavigationItemByPath = (path: string): NavigationItem | undefined => {
  return flatNavigationItems.find(item => item.path === path);
};

export const getNavigationItemById = (id: string): NavigationItem | undefined => {
  return flatNavigationItems.find(item => item.id === id);
};
