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
- January 20, 2026: Complete UI redesign with flat, minimal styling
  - Created comprehensive UI primitives library
  - Built mobile-first AppLayout with 5-tab bottom navigation
  - Redesigned all main pages (Login, Journal, Goals, Map, Ideate, Track)
  - Updated Tailwind theme with gray + indigo color palette
  - Removed all glassmorphism styles for better mobile portability
