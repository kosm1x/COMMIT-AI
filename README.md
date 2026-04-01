# COMMIT - Personal Growth Companion

A personal growth companion implementing the COMMIT framework (Context, Objectives, MindMap, Ideate, Track). React SPA with Supabase backend, Jarvis AI intelligence engine, and mobile support via Capacitor.

## Features

### COMMIT Framework

#### Context (Journal)

- Distraction-free writing with auto-save
- Calendar view of entries
- **AI-Powered Analysis** — emotion detection, pattern recognition, coping strategies
- Primary emotion tracking with visualizations
- Pagination (20 entries per page)

#### Objectives (Vision → Goal → Objective → Task)

- Four-level hierarchy with four-column kanban layout
- Priority assignment (High/Medium/Low) and status tracking
- Due dates, recurring tasks, task completion streaks
- Inline editing, orphaned items, drag-and-drop reordering
- **Undo/redo** — delete actions can be undone via toast button or Ctrl+Z
- Daily planner with time-slot assignment

#### MindMap

- AI-generated mind maps from problem statements
- Kanban boards for all hierarchy levels
- Saved mind map history with fullscreen mode

#### Ideate

- AI-powered idea expansion from rough thoughts
- Idea library with search, filtering, and pagination (30 per page)
- Connection detection between ideas
- Export (TXT, Markdown, JSON)

#### Track

- Daily/Weekly/Monthly views with activity heatmaps
- Streak tracking, completion rates, upcoming deadlines
- Draggable widget dashboard layout

### Jarvis Integration

- **Suggestions Panel** — Jarvis proposes tasks, goals, and improvements as actionable cards
- **Activity Feed** — see what Jarvis changed and why
- **Jarvis Badge** — pending suggestion count in the navigation bar
- AI functions route through Jarvis for full context (memory, calendar, projects)
- Event-driven: database changes trigger Jarvis reactions in real-time
- Graceful fallback to Groq when Jarvis is unavailable
- Production-hardened: structured logging (Pino), 3-layer tool guardrails, provider rotation

## Technology Stack

- **Frontend**: React 18 + TypeScript 5.5 + Vite 5 + Tailwind 3
- **Database**: Supabase (PostgreSQL + RLS on all 15 tables + Auth)
- **AI**: Jarvis-first routing via Supabase Edge Function (`ai-proxy`), Groq fallback
- **Validation**: Zod schemas for all 11 AI response types
- **Testing**: Vitest (217 unit tests) + Playwright (8 E2E tests)
- **Mobile**: Capacitor 8 (iOS + Android)
- **Diagrams**: Mermaid 11 (mind maps)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account

### Installation

```bash
npm install
```

### Environment Variables

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Edge Function secrets (configured in Supabase dashboard):

- `GROQ_API_KEY` — Groq LLM fallback key
- `LLM_API_KEY` / `LLM_ENDPOINT` / `LLM_MODEL` — Primary LLM provider
- `JARVIS_API_URL` / `JARVIS_API_KEY` — Jarvis intelligence engine
- `SUPABASE_SERVICE_ROLE_KEY` — used by commit-events Edge Function auth

### Commands

```bash
npm run dev          # Vite dev server on :5000
npm run build        # Typecheck + production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run test         # Vitest (217 tests, 14 files)
npm run test:e2e     # Playwright E2E (8 tests, 2 files)
npm run test:coverage # Vitest with v8 coverage
npm run types:generate # Regenerate Supabase types
```

## Database Schema (15 tables)

| Table                              | Purpose                                           |
| ---------------------------------- | ------------------------------------------------- |
| `journal_entries`                  | User journal entries                              |
| `ai_analysis`                      | AI-generated emotional analysis                   |
| `visions`                          | Long-term life directions                         |
| `goals`                            | Measurable outcomes linked to visions             |
| `objectives`                       | Milestones linked to goals                        |
| `tasks`                            | Actions linked to objectives (supports recurring) |
| `task_completions`                 | Daily completion tracking for recurring tasks     |
| `ideas`                            | Captured and expanded ideas                       |
| `idea_connections`                 | Relationships between ideas                       |
| `idea_ai_suggestions`              | AI-generated idea enhancements                    |
| `mind_maps`                        | Saved mind map visualizations                     |
| `user_preferences`                 | User settings                                     |
| `daily_plans` / `daily_plan_tasks` | Daily planning                                    |
| `agent_suggestions`                | Jarvis-proposed changes (accept/reject)           |

All tables have Row Level Security (RLS) enabled. The hierarchy tables + journal have `modified_by` provenance tracking (`user`/`jarvis`/`system`). Completed non-recurring tasks are auto-pruned after 15 days.

## AI Integration

AI calls route through a Supabase Edge Function (`ai-proxy`) that tries Jarvis first (full context: memory, goals, calendar, projects) and falls back to Groq if unavailable.

A second Edge Function (`commit-events`) forwards database changes to Jarvis via pg_net triggers, enabling real-time reactions (suggest objective completion, celebrate streaks, analyze journal entries).

12 AI functions: `analyzeJournalEntry`, `extractObjectivesFromJournal`, `generateMindMap`, `completeIdea`, `findIdeaConnections`, `generateDivergentPaths`, `suggestNextSteps`, `generateCriticalAnalysis`, `generateRelatedConcepts`, `suggestObjectivesForGoal`, `suggestTasksForObjective`, `transformIdeaText`.

All validated through Zod schemas. All return mock data when API is unavailable.

## Project Structure

```
src/
  components/              # 60+ components in domain folders
    suggestions/           #   SuggestionsPanel, SuggestionCard, SuggestionsBadge, ActivityFeed
    objectives/            #   cards/, columns/, modals/
    journal/, map/, tracking/, ideas/, navigation/, layout/, ui/
  contexts/                # Auth, Theme, Language, Notification, Undo
  hooks/                   # 12 custom hooks
  services/                # 7 services (AI, objectives, suggestions, etc.)
  lib/                     # Supabase client, auto-generated types, Zod schemas
  utils/                   # fetchWithRetry, security, trackingStats, autoSort
  i18n/                    # en, es, zh translations
  pages/                   # 8 lazy-loaded route components
supabase/
  migrations/              # 20 SQL migrations (additive only)
  functions/ai-proxy/      # Edge Function: Jarvis-first LLM proxy
  functions/commit-events/ # Edge Function: DB webhook → Jarvis event bridge
e2e/                       # Playwright E2E tests
```

## Security

- Row Level Security on all 15 tables
- Authentication via Supabase Auth (email/password + biometric on native)
- API keys are server-side only (Supabase Edge Function secrets)
- Input sanitization via `src/utils/security.ts`
- Password strength indicator on signup
- Edge Function auth validation on webhook endpoint
- `modified_by` CHECK constraints prevent invalid provenance values

## Documentation

- **[COMMIT_METHOD_GUIDE.md](./COMMIT_METHOD_GUIDE.md)** — Non-technical user guide
- **[docs/NORTH-STAR.md](./docs/NORTH-STAR.md)** — Product vision and strategic priorities
- **[docs/V4-TECHNICAL-PLAN.md](./docs/V4-TECHNICAL-PLAN.md)** — v4.0 implementation plan (retention, onboarding, push, insights)
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — Deployment guide and troubleshooting
- **[docs/IMPROVEMENT-PLAN.md](./docs/IMPROVEMENT-PLAN.md)** — Historical improvement roadmap (Phases 1-6)
- **[docs/TECHNICAL_SPECIFICATION.md](./docs/TECHNICAL_SPECIFICATION.md)** — Technical architecture

## License

MIT
