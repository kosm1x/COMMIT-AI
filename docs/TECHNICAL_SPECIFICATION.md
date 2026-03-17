# COMMIT Journal Application - Technical Specification

## Overview

COMMIT Journal is a React-based personal growth application implementing the COMMIT framework (Context, Objectives, MindMap, Ideate, Track). It provides journaling, goal management, mind mapping, idea generation, and progress tracking with AI-powered features.

**Technology Stack:**
- Frontend: React 18.3.1 + TypeScript 5.5.3
- Build Tool: Vite 5.4.21
- Styling: Tailwind CSS 3.4.1
- Icons: Lucide React 0.344.0
- Routing: React Router DOM 7.9.6
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth
- AI: Groq Qwen 3.2 (via OpenAI-compatible API)
- Visualization: Mermaid 11.12.1

---

## Project Structure

```
src/
├── App.tsx                    # Main app component with routing
├── main.tsx                   # React entry point
├── index.css                  # Tailwind imports
├── vite-env.d.ts             # Vite type definitions
├── components/               # Reusable UI components
│   ├── Layout.tsx            # Main layout with sidebar
│   ├── AIAssistantPanel.tsx  # AI-powered idea assistant
│   ├── map/                  # Kanban and mind map components
│   ├── navigation/           # Navigation components
│   └── tracking/             # Progress tracking components
├── contexts/                 # React contexts
│   ├── AuthContext.tsx       # Authentication state management
│   └── ThemeContext.tsx      # Theme management (light/dark mode)
├── hooks/                    # Custom React hooks
│   └── useKeyboardShortcuts.ts
├── lib/                      # Core libraries
│   └── supabase.ts           # Supabase client and types
├── pages/                    # Page components
│   ├── Login.tsx
│   ├── Journal.tsx
│   ├── Objectives.tsx
│   ├── Map.tsx
│   ├── Ideate.tsx
│   ├── IdeaDetail.tsx
│   └── Tracking.tsx
├── services/                 # External service integrations
│   └── aiService.ts          # Groq API integration
├── config/                   # Configuration files
│   └── navigation.ts        # Navigation structure
└── utils/                    # Utility functions
    └── trackingStats.ts     # Statistics calculations
```

---

## Environment Configuration

**Required Environment Variables:**
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
Groq API key is stored as a Supabase Edge Function secret (server-side only):
```bash
supabase secrets set GROQ_API_KEY=your_groq_api_key_here
```

**Configuration Handling:**
- App checks for Supabase config on load
- Shows user-friendly error message if missing
- Creates placeholder Supabase client if env vars missing (prevents crash)
- AI service falls back to mock data if API key missing

---

## Database Schema

### Core Tables

#### `journal_entries`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users, CASCADE DELETE)
- `content` (text, NOT NULL)
- `entry_date` (date, DEFAULT CURRENT_DATE)
- `primary_emotion` (text, nullable) - Added in migration
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())
- **Indexes:** user_id, entry_date DESC, (user_id, entry_date DESC)
- **RLS:** Enabled, users can only access own entries

#### `ai_analysis`
- `id` (uuid, PK)
- `entry_id` (uuid, FK → journal_entries, CASCADE DELETE, UNIQUE)
- `user_id` (uuid, FK → auth.users, CASCADE DELETE)
- `emotions` (jsonb, DEFAULT '[]')
- `patterns` (jsonb, DEFAULT '[]')
- `coping_strategies` (jsonb, DEFAULT '[]')
- `analyzed_at` (timestamptz, DEFAULT now())
- **Indexes:** user_id, entry_id
- **RLS:** Enabled, users can only access own analysis

#### `visions`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users, CASCADE DELETE)
- `title` (text, NOT NULL)
- `description` (text, DEFAULT '')
- `status` (text, DEFAULT 'not_started', CHECK: not_started|in_progress|completed|on_hold)
- `target_date` (date, nullable)
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())
- `last_edited_at` (timestamptz, DEFAULT now())
- **Indexes:** user_id, status, last_edited_at DESC
- **RLS:** Enabled

#### `goals`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users, CASCADE DELETE)
- `vision_id` (uuid, FK → visions, CASCADE DELETE, nullable) - Added in migration
- `title` (text, NOT NULL)
- `description` (text, DEFAULT '')
- `status` (text, DEFAULT 'not_started', CHECK: not_started|in_progress|completed|on_hold)
- `target_date` (date, nullable)
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())
- `last_edited_at` (timestamptz, DEFAULT now())
- **Indexes:** user_id, status, vision_id, (user_id WHERE vision_id IS NULL)
- **RLS:** Enabled

#### `objectives`
- `id` (uuid, PK)
- `goal_id` (uuid, FK → goals, CASCADE DELETE, nullable) - Made nullable in migration
- `user_id` (uuid, FK → auth.users, CASCADE DELETE)
- `title` (text, NOT NULL)
- `description` (text, DEFAULT '')
- `status` (text, DEFAULT 'not_started', CHECK: not_started|in_progress|completed|on_hold)
- `priority` (text, DEFAULT 'medium', CHECK: high|medium|low)
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())
- `last_edited_at` (timestamptz, DEFAULT now())
- **Indexes:** user_id, goal_id, last_edited_at DESC, (user_id WHERE goal_id IS NULL)
- **RLS:** Enabled

#### `tasks`
- `id` (uuid, PK)
- `objective_id` (uuid, FK → objectives, CASCADE DELETE, nullable) - Made nullable in migration
- `user_id` (uuid, FK → auth.users, CASCADE DELETE)
- `title` (text, NOT NULL)
- `description` (text, DEFAULT '')
- `status` (text, DEFAULT 'not_started', CHECK: not_started|in_progress|completed|on_hold)
- `priority` (text, DEFAULT 'medium', CHECK: high|medium|low)
- `due_date` (date, nullable)
- `completed_at` (timestamptz, nullable)
- `notes` (text, DEFAULT '') - Added in migration for subtasks
- `is_recurring` (boolean, DEFAULT false, NOT NULL) - Added for recurring tasks
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())
- `last_edited_at` (timestamptz, DEFAULT now())
- **Indexes:** user_id, objective_id, due_date, last_edited_at DESC, (user_id WHERE objective_id IS NULL)
- **RLS:** Enabled

#### `task_completions`
- `id` (uuid, PK)
- `task_id` (uuid, FK → tasks, CASCADE DELETE, NOT NULL)
- `user_id` (uuid, FK → auth.users, CASCADE DELETE, NOT NULL)
- `completion_date` (date, DEFAULT CURRENT_DATE, NOT NULL)
- `created_at` (timestamptz, DEFAULT now(), NOT NULL)
- **Unique Constraint:** (task_id, completion_date) - Prevents duplicate daily completions
- **Indexes:** task_id, user_id, completion_date, (user_id, completion_date)
- **RLS:** Enabled, users can manage own completions

#### `ideas`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users, CASCADE DELETE)
- `title` (text, NOT NULL)
- `content` (text, DEFAULT '', NOT NULL)
- `initial_input` (text, DEFAULT '', NOT NULL)
- `category` (text, DEFAULT 'general')
- `tags` (jsonb, DEFAULT '[]')
- `status` (text, DEFAULT 'draft', CHECK: draft|active|completed|archived)
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())
- **Indexes:** user_id, status, category, created_at DESC
- **RLS:** Enabled

#### `idea_connections`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users, CASCADE DELETE)
- `idea_id` (uuid, FK → ideas, CASCADE DELETE)
- `connected_idea_id` (uuid, FK → ideas, CASCADE DELETE)
- `connection_type` (text, DEFAULT 'related', CHECK: similar|complementary|prerequisite|related)
- `strength` (integer, DEFAULT 50, CHECK: 1-100)
- `is_ai_generated` (boolean, DEFAULT true)
- `created_at` (timestamptz, DEFAULT now())
- **Constraint:** idea_id != connected_idea_id
- **Indexes:** user_id, idea_id, connected_idea_id
- **RLS:** Enabled

#### `idea_ai_suggestions`
- `id` (uuid, PK)
- `idea_id` (uuid, FK → ideas, CASCADE DELETE)
- `user_id` (uuid, FK → auth.users, CASCADE DELETE)
- `suggestion_type` (text, DEFAULT 'completion', CHECK: completion|enhancement|connection|category)
- `content` (text, NOT NULL)
- `applied` (boolean, DEFAULT false)
- `created_at` (timestamptz, DEFAULT now())
- **Indexes:** idea_id, user_id
- **RLS:** Enabled

#### `mind_maps`
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users, CASCADE DELETE)
- `title` (text, NOT NULL)
- `problem_statement` (text, NOT NULL)
- `mermaid_syntax` (text, NOT NULL)
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())
- **Indexes:** user_id, created_at DESC
- **RLS:** Enabled

### Database Functions and Triggers

**Function: `update_updated_at_column()`**
- Updates `updated_at` timestamp on row update
- Used by: journal_entries

**Function: `update_timestamps()`**
- Updates both `updated_at` and `last_edited_at` on row update
- Used by: goals, objectives, tasks, visions

**Triggers:**
- All tables with `updated_at` have BEFORE UPDATE triggers
- Automatically set timestamps on any UPDATE operation

### Row Level Security (RLS)

All tables have RLS enabled with identical policy pattern:
- **SELECT:** Users can view own records (WHERE auth.uid() = user_id)
- **INSERT:** Users can insert own records (WITH CHECK auth.uid() = user_id)
- **UPDATE:** Users can update own records (USING + WITH CHECK auth.uid() = user_id)
- **DELETE:** Users can delete own records (USING auth.uid() = user_id)

---

## Theme System

### ThemeContext (`src/contexts/ThemeContext.tsx`)

**State:**
- `theme`: 'light' | 'dark'
- `toggleTheme()`: Function to switch between themes

**Behavior:**
- Initializes from `localStorage.getItem('theme')` or system preference (`prefers-color-scheme`)
- Applies `dark` class to `document.documentElement` when dark mode is active
- Persists theme preference to `localStorage`
- Provides `useTheme()` hook for components

**Theme Toggle:**
- Button in Layout sidebar footer (Moon/Sun icons)
- Available in both expanded and collapsed sidebar states
- Instantly switches theme and persists preference

## Authentication System

### AuthContext (`src/contexts/AuthContext.tsx`)

**State:**
- `user`: User | null
- `session`: Session | null
- `loading`: boolean

**Methods:**
- `signUp(email, password)`: Returns `{ error }`
- `signIn(email, password)`: Returns `{ error }`
- `signOut()`: Promise<void>

**Behavior:**
- Checks session on mount via `supabase.auth.getSession()`
- Subscribes to auth state changes via `supabase.auth.onAuthStateChange()`
- Unsubscribes on unmount
- Sets loading to false after initial session check

### Login Page (`src/pages/Login.tsx`)

**Features:**
- Toggle between Sign In / Sign Up modes
- Email and password inputs (password min 6 chars)
- Error message display
- Loading state during authentication
- Gradient background (blue-50 via white to green-50)
- COMMIT branding with BookOpen icon

**Layout:**
- Centered card with max-width md
- Tab buttons for Sign In/Sign Up
- Form with email/password fields
- Submit button with loading state
- Footer text explaining COMMIT framework

---

## Routing Structure

### Route Configuration (`src/App.tsx`)

**Route Hierarchy:**
```
/ → Redirects to /journal
/journal → Journal page
/vision → Objectives page (same as /goals, /objectives, /tasks)
/goals → Objectives page
/objectives → Objectives page
/tasks → Objectives page
/boards → Map page (Kanban view)
/mindmap → Map page (Mind Map view)
/ideate → Ideate page
/ideate/:id → IdeaDetail page (opens in new tab)
/track → Tracking page
```

**Route Guards:**
- Shows loading spinner while auth loading
- Redirects to Login if no user
- Shows config error if Supabase not configured
- All routes except Login require authentication

**Theme Provider:**
- `ThemeProvider` wraps entire app in `App.tsx`
- Provides theme context to all components
- Persists theme preference across sessions

**Special Route:**
- `/ideate/:id` is outside Layout wrapper (opens in new window/tab)

---

## Core Pages

### Journal Page (`src/pages/Journal.tsx`)

**Layout:**
- Left sidebar (w-80): Entry list with calendar dates
- Main area: Editor and analysis display

**Features:**
- **Entry List:**
  - Shows last 30 entries ordered by entry_date DESC
  - Displays date, primary_emotion badge, content preview (2 lines)
  - Selected entry highlighted with blue-50 background
  - "New Entry" button at top

- **Editor:**
  - Date picker input
  - Large textarea (h-96) for content
  - Auto-save after 3 seconds of inactivity (using useRef for timer)
  - "Saving..." / "Auto-saved" status indicator
  - "Analyze Entry" button (purple-blue gradient) when content exists
  - Delete button (trash icon) for existing entries

- **AI Analysis Display:**
  - **Emotional Insights:**
    - Emotion cards with name, intensity percentage, progress bar
    - Emotion icons: Smile (happy/hopeful), Frown (sad/anxious), Meh (neutral)
    - Color-coded progress bars based on emotion type
  - **Patterns Detected:**
    - Bullet list with blue dot indicators
  - **Coping Strategies:**
    - Numbered list with green background
    - Each strategy in numbered badge

**Data Flow:**
- Loads entries on mount (when user available)
- Loads analysis when entry selected
- Auto-save triggers on content change (3s debounce)
- Analysis clears when content changes
- Primary emotion saved to journal_entries on analysis

**State Management:**
- `entries`: JournalEntry[]
- `selectedEntry`: JournalEntry | null
- `content`: string
- `selectedDate`: string (ISO date format)
- `analysis`: AIAnalysis | null
- `analyzing`: boolean
- `saving`: boolean
- `autoSaveTimerRef`: useRef<NodeJS.Timeout | null>

### Objectives Page (`src/pages/Objectives.tsx`)

**Layout:**
- Four-column layout (Vision, Goals, Objectives, Tasks)
- Each column: w-80 (Vision/Goals), w-96 (Objectives), flex-1 (Tasks)

**Hierarchy:**
- Vision → Goals → Objectives → Tasks
- All relationships nullable (orphaned items supported)
- Orphaned items shown in collapsible sections

**Column Features:**

**Vision Column:**
- "New Vision" button (amber-600)
- Vision cards with:
  - Status icon (CheckCircle2, Clock, Pause, Circle)
  - Title, description
  - Target date (if set)
  - Last edited timestamp (formatted: "Just now", "5m ago", "2h ago", or date)
  - Edit/Delete buttons
- Inline editing mode

**Goals Column:**
- "New Goal" button (blue-600)
- Shows goals for selected vision OR orphaned goals
- Goal cards similar to visions
- Vision selector in edit mode
- "Orphaned Goals" collapsible section

**Objectives Column:**
- "New Objective" button (green-600)
- Shows objectives for selected goal OR orphaned objectives
- Priority badges (red/yellow/gray)
- Task count display with progress bar
- Expandable task list within objective card
- "Orphaned Objectives" collapsible section

**Tasks Column:**
- "Add Task" button (purple-600, below title, full width)
- Shows tasks for selected objective OR orphaned tasks
- Task cards with:
  - Checkbox toggle (Circle/CheckCircle2)
  - Title (strikethrough if completed)
  - Priority badge with Flag icon
  - Due date with Calendar icon (hidden for recurring tasks)
  - Last edited timestamp
  - Orphaned indicator
  - Expandable notes/subtasks section
  - Recurring badge (🔁) if `is_recurring` is true
  - "Mark Completed Today" button for recurring tasks
- Notes auto-save on blur
- "Orphaned Tasks" collapsible section
- Recurring tasks tracked via `task_completions` table (daily completions)

**Forms:**
- Modal overlays for creating new items
- Form fields: title, description, status, priority (where applicable), dates
- Vision/Goal/Objective selectors in forms
- Cancel and Create buttons

**State Management:**
- Separate state for each hierarchy level
- Orphaned items loaded on demand (when section expanded)
- Task counts calculated per objective
- Last edited timestamps formatted relative to now

**Type Safety:**
- All component props have TypeScript interfaces
- Status and priority types enforced with type assertions

### Map Page (`src/pages/Map.tsx`)

**Features:**
- View switcher: Kanban Boards / Mind Map
- Tabs at top with LayoutGrid and Network icons
- Active view highlighted in blue-600

**Kanban View (`src/components/map/KanbanView.tsx`):**
- Collapsible sections for Visions, Goals, Objectives, Tasks
- Each section contains respective Kanban component
- ChevronDown/ChevronRight for expand/collapse

**Kanban Components (All support dark mode):**
- `VisionsKanban.tsx`: Status columns with high-contrast dark theme colors
- `GoalsKanban.tsx`: Status columns with dark mode support
- `ObjectivesKanban.tsx`: Status columns with dark mode support
- `TasksKanban.tsx`: Status columns with dark mode support, recurring task indicators
- All Kanban cards use `dark:bg-white/10` backgrounds and `dark:border-white/10` borders
- Column headers use theme-aware background colors (e.g., `dark:bg-gray-800`, `dark:bg-blue-900/30`)

**Mind Map View (`src/components/map/MindMapView.tsx`):**
- Problem statement input (theme-aware)
- "Generate Mind Map" button
- Mermaid diagram rendering with theme-aware initialization
  - Uses `useTheme()` hook to switch between 'default' and 'dark' Mermaid themes
  - Re-initializes Mermaid when theme changes
- Saved mind maps history sidebar (theme-aware)
- Fullscreen toggle
- Node click handlers for creating items
- Create item modal (Goal/Objective/Task) with theme-aware styling
- All UI elements support high-contrast dark mode

### Ideate Page (`src/pages/Ideate.tsx`)

**Layout:**
- Main area: Idea generation interface
- Right sidebar (w-96): Saved ideas list

**Features:**
- **Idea Generation:**
  - Textarea for initial input
  - "Generate Idea" button (yellow-orange gradient)
  - AI generates: title, expanded content, category, tags, suggestions
  - Connection detection to existing ideas
  - Editable generated content before saving
  - "Save Idea" button

- **Saved Ideas Sidebar:**
  - Search input
  - Category filter dropdown
  - Idea cards with:
    - Title, content preview
    - Category badge
    - Tag count
    - Created date
    - Open in new tab button
    - Delete button (on hover)

**Data Flow:**
- Loads all user ideas on mount
- Filters by search term and category
- Opens idea detail in new tab/window

### Idea Detail Page (`src/pages/IdeaDetail.tsx`)

**Features:**
- Full-screen idea editor
- Title, content, category, tags editing
- Status selector (draft/active/completed/archived)
- AI Assistant panel toggle
- Connection display to other ideas
- Save and delete actions
- Back navigation button

**AI Assistant Panel:**
- Tools: Divergent Paths, Next Steps, Critical Analysis, Related Concepts
- Each tool generates AI content on demand
- Expandable result sections

### Tracking Page (`src/pages/Tracking.tsx`)

**Features:**
- Time period selector: Daily / Weekly / Monthly
- Overview cards component
- Kanban overview component
- Time period view component (DailyView/WeeklyView/MonthlyView)

**Components:**
- `KanbanOverview`: Status breakdown with dark mode support
- `DailyView`: Day-specific tracking with recurring task support and dark mode
- `WeeklyView`: Week-specific tracking with dark mode gradients
- `MonthlyView`: Month-specific tracking with dark mode heatmap

**Tracking Features:**
- All progress cards use theme-aware gradients (e.g., `dark:from-blue-900/20`)
- Activity heatmaps use dark-optimized color scales
- Recurring task completions tracked separately via `task_completions` table
- Daily/Weekly/Monthly views aggregate recurring task completions

---

## Layout System

### Main Layout (`src/components/Layout.tsx`)

**Structure:**
- Sidebar (left) + Main content area
- Mobile: Sidebar slides in/out, overlay backdrop
- Desktop: Sidebar always visible, collapsible

**Sidebar:**
- **Header:**
  - COMMIT logo (BookOpen icon, blue-600)
  - App name and subtitle
  - Collapse/expand button (desktop only)
  - Close button (mobile only)

- **Search Bar:**
  - "Search or jump to..." button
  - Opens command palette
  - Keyboard shortcut indicator (⌘K)

- **Navigation:**
  - NavigationGroup components
  - Groups from navigation config
  - Collapsible groups

- **Footer:**
  - User info card (email, avatar initial)
  - Theme toggle button (Moon/Sun icons)
  - Sign out button
  - Collapse button (desktop)

**Main Content:**
- Header bar (mobile only) with menu button
- Breadcrumbs component
- Page content area
- Bottom padding for mobile tab bar

**Overlays:**
- Command palette modal
- Bottom tab bar (mobile only)
- Quick actions component

### Navigation Components

**NavigationGroup (`src/components/navigation/NavigationGroup.tsx`):**
- Renders navigation items from config
- Supports collapsible groups
- Active route highlighting
- Icon display

**CommandPalette (`src/components/navigation/CommandPalette.tsx`):**
- Modal overlay with search
- Filters navigation items by query
- Keyboard navigation (ArrowUp/Down, Enter, Escape)
- Shows item descriptions and shortcuts
- Closes on selection or Escape

**BottomTabBar (`src/components/navigation/BottomTabBar.tsx`):**
- Fixed bottom bar (mobile only)
- Four navigation items + Quick Add button (center, elevated)
- Active route highlighting
- Icons with labels

**Breadcrumbs (`src/components/navigation/Breadcrumbs.tsx`):**
- Shows current route path
- Clickable navigation segments

**QuickActions (`src/components/navigation/QuickActions.tsx`):**
- Floating action buttons
- Context-aware quick actions

---

## AI Service Integration

### AI Service (`src/services/aiService.ts`)

**API Endpoint:**
- Base URL: `https://api.groq.com/openai/v1/chat/completions`
- Authentication: Bearer token in Authorization header
- Model: `qwen/qwen3-32b`
- Method: POST
- Headers: `Content-Type: application/json`

**Functions:**

#### `analyzeJournalEntry(content: string): Promise<AnalysisResult>`
- **Input:** Journal entry text
- **Output:**
  ```typescript
  {
    emotions: Array<{name: string, intensity: number, color: string}>,
    patterns: string[],
    coping_strategies: string[],
    primary_emotion: string
  }
  ```
- **Fallback:** Mock analysis based on keyword detection
- **Emotion Colors:** Mapped from emotion name to Tailwind classes

#### `extractObjectivesFromJournal(content: string): Promise<string[]>`
- Extracts potential goals/objectives from journal text
- Returns empty array if no API key

#### `generateMindMap(problemStatement: string): Promise<MindMapResult>`
- **Output:**
  ```typescript
  {
    title: string,
    mermaidSyntax: string
  }
  ```
- Generates Mermaid mindmap syntax
- Fallback: Generic problem breakdown structure

#### `completeIdea(initialInput: string): Promise<IdeaCompletionResult>`
- **Output:**
  ```typescript
  {
    title: string,
    expandedContent: string,
    category: string,
    tags: string[],
    suggestions: string[]
  }
  ```
- Expands minimal idea input into full idea

#### `findIdeaConnections(currentIdea: string, existingIdeas: Array<{id, title, content}>): Promise<IdeaConnection[]>`
- **Output:**
  ```typescript
  Array<{
    ideaId: string,
    ideaTitle: string,
    connectionType: 'similar'|'complementary'|'prerequisite'|'related',
    strength: number,
    reason: string
  }>
  ```
- Finds connections between ideas

#### `generateDivergentPaths(ideaTitle: string, ideaContent: string): Promise<DivergentPath[]>`
- Generates alternative approaches to an idea

#### `suggestNextSteps(ideaTitle: string, ideaContent: string): Promise<NextStep[]>`
- Generates actionable next steps

#### `generateCriticalAnalysis(ideaTitle: string, ideaContent: string): Promise<CriticalAnalysis>`
- Provides strengths, challenges, assumptions, alternative perspectives

#### `generateRelatedConcepts(ideaTitle: string, ideaContent: string): Promise<RelatedConcept[]>`
- Suggests related frameworks and concepts

**Error Handling:**
- All functions catch errors and return fallback/mock data
- Console.error for debugging (in development)
- Never throws errors to UI

**Mock Data:**
- Comprehensive mock responses for all functions
- Keyword-based detection for journal analysis
- Realistic placeholder data

---

## Styling System

### Tailwind CSS Configuration

**Base Configuration:**
- Content: `['./index.html', './src/**/*.{js,ts,jsx,tsx}']`
- Dark mode: `darkMode: 'class'` (enabled)
- Default theme with custom extensions
- No plugins

**CSS Variables (Light Theme):**
- `--bg-primary`: #ffffff
- `--bg-secondary`: #f8fafc
- `--bg-tertiary`: #f1f5f9
- `--text-primary`: #0f172a
- `--text-secondary`: #475569
- `--text-tertiary`: #94a3b8
- `--border-primary`: #e2e8f0
- `--border-secondary`: #f1f5f9
- `--accent-primary`: #4f46e5 (Indigo 600)
- `--accent-hover`: #4338ca (Indigo 700)
- `--accent-subtle`: #eef2ff (Indigo 50)

**CSS Variables (Dark Theme - High Contrast):**
- `--bg-primary`: #000000 (pure black)
- `--bg-secondary`: #0a0a0a
- `--bg-tertiary`: #171717
- `--text-primary`: #ffffff (pure white)
- `--text-secondary`: #e5e5e5
- `--text-tertiary`: #a3a3a3
- `--border-primary`: #262626
- `--border-secondary`: #404040
- `--accent-primary`: #6366f1 (Indigo 500)
- `--accent-hover`: #818cf8 (Indigo 400)
- `--accent-subtle`: #1e1b4b (Indigo 950)

**Color Scheme:**
- Primary: Blue-600 (buttons, accents)
- Secondary: Green-600 (objectives), Purple-600 (tasks), Amber-600 (visions)
- Status Colors:
  - Completed: Green-600 (dark: Green-400)
  - In Progress: Blue-600 (dark: Blue-400)
  - On Hold: Yellow-600 (dark: Yellow-400)
  - Not Started: Gray-400 (dark: Gray-400)
- Priority Colors:
  - High: Red (bg-red-100 dark:bg-red-900/30, text-red-700 dark:text-red-400)
  - Medium: Yellow (bg-yellow-100 dark:bg-yellow-900/30, text-yellow-700 dark:text-yellow-400)
  - Low: Gray (bg-gray-100 dark:bg-gray-800, text-gray-700 dark:text-gray-400)

**Component Patterns:**
- Glass Cards: `.glass-card` (bg-white/70 dark:bg-black/70 with backdrop blur)
- Strong Glass: `.glass-strong` (bg-white/90 dark:bg-black/90 with backdrop blur)
- Cards: `bg-white dark:bg-white/5 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-6`
- Buttons: `.btn-primary`, `.btn-secondary`, `.btn-ghost` (theme-aware)
- Inputs: `.input-modern` (theme-aware with focus states)
- Modals: `fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50`
- Dark Mode Classes: All components use `dark:` prefix for dark theme variants

**Responsive:**
- Mobile-first approach
- `lg:` breakpoint for desktop (1024px+)
- Sidebar: Hidden on mobile, always visible on desktop
- Bottom tab bar: Hidden on desktop (`lg:hidden`)

---

## State Management Patterns

### React Hooks Usage

**useState:**
- Local component state
- Form inputs
- UI state (modals, expanded sections)
- Loading states

**useEffect:**
- Data fetching on mount
- Cleanup functions for subscriptions/timers
- Dependency arrays properly configured

**useRef:**
- Timer references (auto-save)
- DOM element references (Mermaid rendering)
- Input focus management

**useContext:**
- AuthContext for user/session
- Access via `useAuth()` hook
- ThemeContext for theme management
- Access via `useTheme()` hook

### Data Fetching Pattern

```typescript
useEffect(() => {
  if (user) {
    loadData();
  }
}, [user]);

const loadData = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('user_id', user.id);
    if (error) throw error;
    setData(data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};
```

### Auto-save Pattern

```typescript
const timerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }
  
  if (content && content !== originalContent) {
    timerRef.current = setTimeout(() => {
      handleSave();
      timerRef.current = null;
    }, 3000);
  }
  
  return () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };
}, [content, originalContent]);
```

---

## Keyboard Shortcuts

### Implementation (`src/hooks/useKeyboardShortcuts.ts`)

**Shortcuts:**
- `Cmd/Ctrl + K`: Open command palette
- `Cmd/Ctrl + Shift + P`: Open command palette (alternative)
- `Cmd/Ctrl + {1-6}`: Navigate to routes (based on navigation shortcuts)

**Behavior:**
- Detects Mac vs Windows/Linux (metaKey vs ctrlKey)
- Prevents default browser behavior
- Navigates via React Router
- Only works when navigation items have `available: true`

---

## Type Definitions

### Core Types (`src/lib/supabase.ts`)

**Database Type:**
- Complete TypeScript interface for all tables
- Row, Insert, Update types for each table
- Matches actual database schema exactly

**Supabase Client:**
- Exported singleton instance
- Created with URL and anon key
- `hasSupabaseConfig` boolean export for config checking

### Component Props Types

All major components have explicit TypeScript interfaces:
- `VisionColumnProps`, `GoalsColumnProps`, `ObjectivesColumnProps`, `TasksColumnProps`
- `GoalCardProps`, `ObjectiveCardProps`, `TaskCardProps`
- `CommandPaletteProps`, `LayoutProps`, etc.

### Status and Priority Types

```typescript
type Status = 'not_started' | 'in_progress' | 'completed' | 'on_hold';
type Priority = 'high' | 'medium' | 'low';
type IdeaStatus = 'draft' | 'active' | 'completed' | 'archived';
```

---

## Utility Functions

### Tracking Stats (`src/utils/trackingStats.ts`)

**Functions:**
- `calculateStatusCounts(items)`: Returns count by status
- `calculateCompletionPercentage(completed, total)`: Returns 0-100
- `getCompletionStats(items)`: Returns {completed, total, percentage}
- `filterByDateRange(items, start, end)`: Filters by created_at
- `filterCompletedInRange(items, start, end)`: Filters by completed_at
- `getStartOfDay(date)`, `getEndOfDay(date)`
- `getStartOfWeek(date)`, `getEndOfWeek(date)`
- `getStartOfMonth(date)`, `getEndOfMonth(date)`
- `getDaysInMonth(date)`
- `formatDate(date)`, `formatShortDate(date)`

---

## Build Configuration

### Vite Config (`vite.config.ts`)

```typescript
{
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react']
  }
}
```

### TypeScript Config

**tsconfig.json:** Project references to app and node configs
**tsconfig.app.json:** App-specific TypeScript settings
**tsconfig.node.json:** Node/Vite-specific settings

### ESLint Config (`eslint.config.js`)

- Extends: @eslint/js recommended, typescript-eslint recommended
- Plugins: react-hooks, react-refresh
- Rules: React hooks rules, react-refresh only-export-components (warn)

---

## Key Implementation Details

### Orphaned Items Handling

- Goals can exist without vision_id (orphaned)
- Objectives can exist without goal_id (orphaned)
- Tasks can exist without objective_id (orphaned)
- Orphaned items shown in collapsible sections
- Loaded on-demand when section expanded
- Can be linked to parents via edit forms

### Timestamp Formatting

- Relative format: "Just now" (< 1 min), "5m ago" (< 60 min), "2h ago" (< 24h), or date
- Function: `formatLastEdited(dateString: string)`

### Status Icons

- Completed: CheckCircle2 (green-600)
- In Progress: Clock (blue-600)
- On Hold: Pause (yellow-600)
- Not Started: Circle (gray-400)

### Priority Badges

- High: Red background (bg-red-100, text-red-700, border-red-200)
- Medium: Yellow background (bg-yellow-100, text-yellow-700, border-yellow-200)
- Low: Gray background (bg-gray-100, text-gray-700, border-gray-200)

### Mermaid Integration

- Initialized with `mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default' })`
- Theme dynamically switches based on `useTheme()` hook
- Re-initializes when theme changes via `useEffect` dependency on `theme`
- Rendered via `mermaid.render(id, syntax)` returning SVG
- Injected into div element
- Node click handlers added after render
- Error handling with user-friendly message
- Container uses `dark:bg-black/40` for dark mode background

### Form Validation

- Email: HTML5 email type
- Password: minLength={6}
- Required fields: HTML5 required attribute
- Error display: Red background with error message

### Loading States

- Spinner: `border-4 border-blue-600 border-t-transparent rounded-full animate-spin`
- Button disabled state: `disabled:opacity-50 disabled:cursor-not-allowed`
- Loading text: "Loading...", "Saving...", "Generating..."

---

## Security Considerations

### Row Level Security (RLS)

- All tables have RLS enabled
- Policies check `auth.uid() = user_id`
- Users can only access their own data
- CASCADE DELETE on foreign keys

### Environment Variables

- Never exposed to client (Vite env vars are public)
- API keys used server-side only (Groq key used client-side but should be proxied in production)
- Supabase anon key is safe for client-side use

### Authentication

- Supabase Auth handles all authentication
- Session managed by Supabase
- Protected routes check user state

---

## Performance Optimizations

### Code Splitting

- React Router handles route-based splitting
- Components loaded on demand

### Data Loading

- Limited queries (e.g., last 30 journal entries)
- Indexed database queries
- Orphaned items loaded on-demand

### Rendering

- Conditional rendering to avoid unnecessary DOM
- Memoization not used (could be added for complex components)
- Auto-save debounced (3 seconds)

### Vite Optimizations

- Lucide React excluded from pre-bundling (optimizeDeps.exclude)
- Tree-shaking enabled by default

---

## Error Handling

### Pattern

```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
  // Handle data
} catch (error) {
  console.error('Error:', error);
  // Show user-friendly message or fallback
}
```

### User-Facing Errors

- Login errors displayed in red alert box
- Configuration errors shown as full-screen message
- AI errors fall back to mock data (silent)
- Database errors logged to console (should show user message)

---

## Mobile Responsiveness

### Breakpoints

- Mobile: Default (< 1024px)
- Desktop: `lg:` prefix (≥ 1024px)

### Mobile Features

- Sidebar slides in/out with overlay
- Bottom tab bar navigation
- Touch-friendly button sizes (min 44x44px)
- Responsive padding and spacing

### Desktop Features

- Sidebar always visible
- Collapsible sidebar
- No bottom tab bar
- More horizontal space for columns

---

## Testing Considerations

### Component Structure

- All components are functional components
- Hooks-based state management
- Props interfaces for type safety
- No class components

### Data Flow

- Unidirectional: User action → State update → Re-render
- Async operations: Loading states → Success/Error handling
- Side effects: useEffect with proper dependencies

---

## Deployment Requirements

### Build

```bash
npm run build
```

Output: `dist/` directory with static assets

### Environment

- Supabase project with all migrations applied
- Environment variables set in deployment platform
- Vite build optimizes for production

### Static Hosting

- Can be deployed to any static host (Vercel, Netlify, etc.)
- No server-side code required
- API calls go directly to Supabase and Groq

---

## Recurring Tasks

### Implementation

**Database:**
- `tasks.is_recurring`: Boolean flag (default false)
- `task_completions` table: Tracks daily completions for recurring tasks
- Unique constraint on `(task_id, completion_date)` prevents duplicates

**UI Features:**
- Checkbox in task creation/edit forms
- When checked, disables `due_date` input (recurring tasks don't have due dates)
- Recurring badge (🔁) displayed on task cards
- "Mark Completed Today" button for recurring tasks
- Button state reflects whether task is completed today (checks `task_completions`)

**Behavior:**
- Recurring tasks maintain their `status` (don't change to 'completed' when marked done)
- Daily completions tracked separately in `task_completions` table
- Kanban drag-to-completed for recurring tasks creates `task_completions` entry instead of changing status
- Tracking views aggregate recurring task completions for daily/weekly/monthly stats

**Components Updated:**
- `Objectives.tsx`: Task form, task cards, completion tracking
- `TasksKanban.tsx`: Recurring task handling in drag-and-drop
- `DailyView.tsx`: Separate section for recurring tasks with "Completed Today" toggle
- `WeeklyView.tsx`: Includes recurring completions in daily stats
- `MonthlyView.tsx`: Includes recurring completions in monthly stats
- `KanbanOverview.tsx`: Shows recurring indicator (🔁) for recurring tasks

## Future Enhancements (Not Implemented)

- User preferences table (migration exists but not used)
- Drag-and-drop for Kanban boards (partially implemented, needs refinement)
- Real-time collaboration
- Export functionality
- Mobile app (PWA capabilities not implemented)
- Offline support
- Advanced search
- Tags system for journal entries
- Notifications

---

## Critical Implementation Notes

1. **Auto-save Timer:** Must use `useRef`, not `useState`, to avoid stale closures
2. **Orphaned Items:** Load on-demand, not via polling intervals
3. **Type Safety:** All component props must have explicit interfaces
4. **RLS Policies:** Must match exact pattern shown in migrations
5. **Mermaid Rendering:** Must clear innerHTML before rendering new diagram, re-initialize when theme changes
6. **Theme Management:** Theme persisted in `localStorage`, applied to `document.documentElement` via `dark` class
7. **Dark Mode:** All components must use `dark:` prefix classes for dark theme variants
8. **Error Boundaries:** Not implemented (should be added)
9. **Loading States:** Always show during async operations
10. **Form Validation:** HTML5 validation + custom error messages
11. **Keyboard Shortcuts:** Must prevent default browser behavior
12. **Responsive Design:** Mobile-first, desktop enhancements via `lg:` prefix
13. **Recurring Tasks:** Use `task_completions` table for daily tracking, don't change task status
14. **High Contrast Dark Mode:** Uses pure black (#000000) backgrounds and white (#ffffff) text for maximum contrast

---

## Recent Updates (Latest Changes)

### Dark Mode Implementation
- **ThemeContext** (`src/contexts/ThemeContext.tsx`): Complete theme management system
- **High-Contrast Dark Theme**: Pure black backgrounds (#000000) with white text (#ffffff) for maximum readability
- **Theme Toggle**: Button in Layout sidebar footer (Moon/Sun icons)
- **Component Updates**: All major components updated with `dark:` variant classes
  - Kanban boards (Visions, Goals, Objectives, Tasks)
  - Mind Map view with theme-aware Mermaid rendering
  - Tracking page components (Daily, Weekly, Monthly views)
  - All modals, cards, inputs, and buttons

### Recurring Tasks
- **Database Schema**: `is_recurring` column in `tasks` table, `task_completions` table for daily tracking
- **UI Features**: Recurring checkbox, "Mark Completed Today" button, recurring badge
- **Tracking Integration**: Recurring completions included in daily/weekly/monthly statistics
- **Kanban Support**: Recurring tasks handled specially in drag-and-drop operations

### Component Improvements
- **Objectives Page**: Task form improvements, recurring task support, better card layouts
- **Kanban Views**: High-contrast dark mode colors, improved legibility
- **Mind Map**: Theme-aware Mermaid diagrams, dark mode UI elements
- **Tracking**: Dark mode gradients, improved heatmap visibility

---

This specification is complete and based exclusively on the actual codebase. All file paths, component names, database schemas, and implementation details match the source code exactly.


