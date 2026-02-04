# COMMIT Personal Growth Framework

## Overview
A Vite + React + TypeScript personal growth tracking app with Supabase backend and AI features powered by Groq. Features 5 main sections: Journal, Goals, Map, Ideate, and Track.

## Tech Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS with flat design system
- **Backend**: Supabase (authentication, database)
- **AI**: Groq API integration
- **Routing**: React Router DOM

## Project Structure
```
src/
├── components/
│   ├── ui/           # Reusable UI primitives (Button, Card, Input, Modal, BottomSheet, etc.)
│   ├── layout/       # Layout components (AppLayout with bottom navigation)
│   └── ...           # Feature-specific components
├── pages/            # Main app pages (Journal, Objectives, Map, Ideate, Tracking)
├── config/           # Configuration files
├── hooks/            # Custom React hooks
├── i18n/             # Internationalization (en, es, zh)
├── lib/              # Library integrations (Supabase)
├── services/         # Service layer (AI, objectives, user preferences)
└── utils/            # Utility functions
```

## Design System
- **Style**: Flat, minimal design (no glassmorphism)
- **Colors**: Gray + indigo palette with CSS variables for theming
- **Mobile-first**: Optimized for mobile with responsive breakpoints
- **Components**: Reusable UI primitives in `src/components/ui/`
  - Button, Card, Input, TextArea, Modal, BottomSheet, IconButton, TabBar, Header

## Development
- **Run**: `npm run dev` (port 5000)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Type Check**: `npm run typecheck`

## Required Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_GROQ_API_KEY` - Groq API key for AI features

## Recent Changes
- January 21, 2026: Fixed session auto-sorting race condition
  - Fixed bug where Kanban boards would skip sorting if Goals page loaded first
  - Each view (Goals page, Kanban boards) now sorts independently on first mount
  - Session flag centralized in useObjectivesState.ts; Kanban components use component-level refs only
  - Sorting remains transparent to user and happens once per component lifecycle
- January 20, 2026: Added one-time session auto-sorting for cards
  - Goal, Objective, and Task cards automatically sort on first load each session
  - Sort priority: status (in-progress > not started > on hold > completed), then due date (soonest first), then priority (high > medium > low)
  - Sorting is transparent to the user and only happens once per session
  - Implemented in both Goals page and Kanban boards (Map page)
- January 20, 2026: Made logout transition seamless
  - Removed page reload on logout, letting React handle state transition smoothly
- January 20, 2026: Fixed user preference persistence bugs
  - Fixed race condition in last page tracking (save was overwriting DB-synced value before restore)
  - Fixed language reset bug (Login page was resetting language to English on load)
  - Styled logout button to match other settings options (removed red fill)
  - User preferences (language, theme, last page) now persist correctly across logout/login
- January 20, 2026: Complete UI redesign with flat, minimal styling
  - Created comprehensive UI primitives library
  - Built mobile-first AppLayout with 5-tab bottom navigation
  - Redesigned all main pages (Login, Journal, Goals, Map, Ideate, Track)
  - Updated Tailwind theme with gray + indigo color palette
  - Removed all glassmorphism styles for better mobile portability
