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

// Function to get flat translated navigation items
export const getTranslatedFlatNavigationItems = (t: (key: string) => string): NavigationItem[] => {
  const groups = getTranslatedNavigationGroups(t);
  return groups.flatMap(group =>
    group.items.flatMap(item => [item, ...(item.children || [])])
  );
};

export const getNavigationItemByPath = (path: string): NavigationItem | undefined => {
  return flatNavigationItems.find(item => item.path === path);
};

export const getNavigationItemById = (id: string): NavigationItem | undefined => {
  return flatNavigationItems.find(item => item.id === id);
};

// Function to get translated navigation groups
export const getTranslatedNavigationGroups = (t: (key: string) => string): NavigationGroup[] => {
  return [
    {
      id: 'context',
      label: t('nav.context'),
      collapsible: false,
      defaultExpanded: true,
      items: [
        {
          id: 'journal',
          label: t('nav.journal'),
          description: t('nav.journalDescription'),
          icon: BookOpen,
          path: '/journal',
          available: true,
          shortcut: '1',
        },
      ],
    },
    {
      id: 'objectives-tasks',
      label: t('nav.objectivesTasks'),
      collapsible: false,
      defaultExpanded: true,
      items: [
        {
          id: 'goals',
          label: t('nav.goals'),
          description: t('nav.goalsDescription'),
          icon: Flag,
          path: '/goals',
          available: true,
          shortcut: '2',
        },
      ],
    },
    {
      id: 'maps',
      label: t('nav.maps'),
      collapsible: false,
      defaultExpanded: true,
      items: [
        {
          id: 'boards',
          label: t('nav.kanbanBoards'),
          description: t('nav.kanbanBoardsDescription'),
          icon: LayoutGrid,
          path: '/boards',
          available: true,
          shortcut: '3',
        },
        {
          id: 'mindmap',
          label: t('nav.mindMap'),
          description: t('nav.mindMapDescription'),
          icon: Network,
          path: '/mindmap',
          available: true,
          shortcut: '4',
        },
      ],
    },
    {
      id: 'ideation',
      label: t('nav.ideation'),
      collapsible: false,
      defaultExpanded: true,
      items: [
        {
          id: 'ideate',
          label: t('nav.ideate'),
          description: t('nav.ideateDescription'),
          icon: Lightbulb,
          path: '/ideate',
          available: true,
          shortcut: '5',
        },
      ],
    },
    {
      id: 'tracking',
      label: t('nav.tracking'),
      collapsible: false,
      defaultExpanded: true,
      items: [
        {
          id: 'track',
          label: t('nav.progressTracking'),
          description: t('nav.progressTrackingDescription'),
          icon: TrendingUp,
          path: '/track',
          available: true,
          shortcut: '6',
        },
      ],
    },
  ];
};
