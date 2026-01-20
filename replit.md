# Creative Tracker App

## Overview
A Vite + React + TypeScript application with Supabase backend integration and AI features powered by Groq.

## Tech Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **Backend**: Supabase (authentication, database)
- **AI**: Groq API integration
- **Routing**: React Router DOM

## Project Structure
```
src/
├── components/    # React components
├── config/        # Configuration files
├── hooks/         # Custom React hooks
├── i18n/          # Internationalization (en, es, zh)
├── lib/           # Library integrations (Supabase)
├── services/      # Service layer (AI, objectives, user preferences)
├── utils/         # Utility functions
```

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
- January 20, 2026: Configured for Replit environment (Vite server on 0.0.0.0:5000)
