# COMMIT-AI

Personal growth companion implementing the COMMIT framework (Context, Objectives, MindMap, Ideate, Track). React SPA with Supabase backend and Groq AI.

## Commands

```bash
npm run dev          # Vite dev server on :5000
npm run build        # Typecheck + Vite production build
npm run typecheck    # tsc --noEmit -p tsconfig.app.json
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run test         # Vitest unit tests (217 tests, 14 files)
npm run test:watch   # Vitest watch mode
npm run test:coverage # Vitest with v8 coverage
npm run test:e2e     # Playwright E2E tests (8 tests, 2 files)
npm run types:generate # Regenerate Supabase types (requires local Supabase running)
```

## Stack

- **Frontend**: React 18 + TypeScript 5.5 + Vite 5 + Tailwind 3
- **Database**: Supabase (PostgreSQL + RLS on all 15 tables + Auth)
- **AI**: Groq API (Qwen 3.2) via Supabase Edge Function (`ai-proxy`) — key is server-side, vendor-agnostic via `LLM_MODEL`/`LLM_ENDPOINT` env vars
- **Validation**: Zod schemas for all 11 AI response types (`src/lib/aiSchemas.ts`)
- **Mobile**: Capacitor 8 (iOS + Android)
- **Diagrams**: Mermaid 11 (mind maps)
- **No custom backend** — Supabase Edge Functions for AI proxy, browser for everything else

## Architecture

```
src/
  App.tsx                        # Router + context providers (Language > Theme > Auth > Notification > BrowserRouter)
  pages/                         # 8 lazy-loaded route components
    IdeaDetail.tsx               # Layout orchestrator (split in Phase 2.2)
  components/                    # 60+ components in domain folders:
    ideas/                       #   types.ts, SelectionMenu.tsx, ConnectionsSidebar.tsx
    journal/, objectives/,       #   cards/, columns/, modals/ subfolders
    map/, tracking/,             #   widgets/ subfolder
    suggestions/                 #   SuggestionsPanel, SuggestionCard, SuggestionsBadge, ActivityFeed
    navigation/, layout/, ui/
  contexts/                      # AuthContext, ThemeContext, LanguageContext, NotificationContext
  hooks/                         # 11 custom hooks
    useObjectivesState.ts        # Thin composer (split in Phase 2.1)
    useObjectivesData.ts         # Data loading + state
    useObjectivesSelection.ts    # Selection path + navigation
    useObjectivesCRUD.ts         # CRUD + toggles + conversions
    useIdeaEditor.ts             # Text selection + AI transforms
    useFocusTrap.ts              # Tab cycling + focus restore for modals
    useAgentSuggestions.ts       # Jarvis suggestions state + accept/reject
  services/                      # 7 services
    aiService.ts                 # 12 AI functions via callLLM(), Zod-validated, 30s timeout, AbortSignal
    objectivesService.ts         # CRUD for Vision/Goal/Objective/Task
    suggestionsService.ts        # CRUD for agent_suggestions (Jarvis proposals)
  lib/
    supabase.ts                  # Typed client: createClient<Database>()
    database.types.ts            # Auto-generated from DB (npm run types:generate)
    aiSchemas.ts                 # Zod schemas for all AI response types
  utils/                         # fetchWithRetry, security, trackingStats, autoSort, familyTree
  i18n/                          # en.ts, es.ts, zh.ts
  config/navigation.ts           # Nav structure
supabase/
  migrations/                    # 20 SQL migrations (additive only)
  functions/ai-proxy/            # Edge Function: vendor-agnostic LLM proxy
  functions/commit-events/       # Edge Function: DB webhook → Jarvis event bridge
  config.toml                    # Local Supabase config (for types:generate)
docs/                            # Improvement plan, deployment, tech spec
```

### Data hierarchy

Vision > Goal > Objective > Task (4-level). Each level has nullable FK to parent (orphaned items supported). Status: `not_started | in_progress | completed | on_hold`. Priority: `high | medium | low`. Completed non-recurring tasks are auto-pruned after 15 days via `prune_completed_tasks()` (pg_cron daily + client RPC on login).

### Database tables (15)

`journal_entries`, `ai_analysis`, `visions`, `goals`, `objectives`, `tasks`, `task_completions`, `ideas`, `idea_connections`, `idea_ai_suggestions`, `mind_maps`, `user_preferences`, `daily_planner`, `daily_plan_tasks`, `agent_suggestions`. All have `user_id` FK with CASCADE DELETE + RLS policies for SELECT/INSERT/UPDATE/DELETE. The 4 hierarchy tables + `journal_entries` have `modified_by` provenance tracking (`user`/`jarvis`/`system`).

### AI service (`src/services/aiService.ts`)

12 functions via `callLLM()`: `analyzeJournalEntry`, `extractObjectivesFromJournal`, `generateMindMap`, `completeIdea`, `findIdeaConnections`, `generateDivergentPaths`, `suggestNextSteps`, `generateCriticalAnalysis`, `generateRelatedConcepts`, `suggestObjectivesForGoal`, `suggestTasksForObjective`, `transformIdeaText`. All validated through Zod schemas (`lib/aiSchemas.ts`). All return mock data when API key missing.

### Auth flow

Supabase Auth (email/password). `AuthContext` manages session + syncs `user_preferences` on sign-in. Biometric auth via Capacitor plugin on native platforms.

## Conventions

- **Lazy loading**: All pages use `React.lazy()` + `<Suspense>` + `<ErrorBoundary>`
- **State**: React Context (no Redux/Zustand). Domain logic in custom hooks, not components
- **Styling**: Tailwind utility classes. Dark mode via `dark:` variant + HTML class toggle. No hardcoded colors — use Tailwind palette
- **i18n**: `useLanguage().t('key')` — all user-visible strings must use translation keys, never hardcoded English
- **Fetch**: `fetchWithRetry()` with exponential backoff (utils version is canonical — do NOT create new retry logic)
- **Types**: Auto-generated from DB via `npm run types:generate` (`lib/database.types.ts`). Typed Supabase client provides full query inference
- **Env vars**: `VITE_` prefix required (Vite convention). Access via `import.meta.env`
- **Error handling**: Never swallow errors silently. Show user-facing feedback for all async failures
- **Accessibility**: Every interactive element needs `aria-label`. Every image needs `alt`. Modals need focus trap
- **File size**: No single file should exceed 600 LOC. Split into focused units before it grows
- **Migrations**: Additive only. Never DROP or ALTER existing columns

## Environment

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
# --- Edge Function secrets (Supabase dashboard, not in client code) ---
# GROQ_API_KEY          — Groq LLM fallback key
# LLM_API_KEY           — Primary LLM provider key
# LLM_ENDPOINT          — Primary LLM endpoint URL
# LLM_MODEL             — Primary LLM model ID
# JARVIS_API_URL        — Jarvis base URL (e.g. http://host:8080)
# JARVIS_API_KEY        — Jarvis API authentication key
# SUPABASE_SERVICE_ROLE_KEY — used by commit-events Edge Function auth
```

## Known Issues (prioritized)

1. ~~**CRITICAL — API key exposed client-side**~~: Fixed (Phase 1.1) — moved to Edge Function
2. ~~**CRITICAL — Zero tests**~~: Fixed (Phase 1.2-1.3) — 81 tests via Vitest
3. ~~**HIGH — Monolithic state hook**~~: Fixed (Phase 2.1) — split into 4 focused hooks
4. ~~**HIGH — No error UI**~~: Fixed (Phase 2.3) — NotificationContext + toast system, Journal integrated
5. ~~**HIGH — No AI response validation**~~: Fixed (Phase 2.5) — 11 Zod schemas with safeParse
6. ~~**MEDIUM — Duplicate fetchWithRetry**~~: Fixed (Phase 1.4) — consolidated to canonical utils version
7. ~~**MEDIUM — Manual DB types**~~: Fixed (Phase 2.4) — auto-generated from DB (14 tables, 743 LOC)
8. ~~**MEDIUM — No memoization**~~: Fixed (Phase 3.1) — 4 card components wrapped in `React.memo`, MindMapView render memoized
9. ~~**MEDIUM — No pagination**~~: Fixed (Phase 3.2) — Journal cursor-based (20/page), Ideas offset-based (30/page)
10. ~~**MEDIUM — Missing accessibility**~~: Fixed (Phase 3.4) — 46 ARIA labels, focus traps on Modal/BottomSheet, nav landmarks
11. ~~**LOW — 71 `any`/`@ts-ignore` instances**~~: Fixed — all 35 lint errors eliminated (0 errors remaining)
12. ~~**LOW — 18 markdown files at root**~~: Fixed (Phase 5) — consolidated to 3 root + 3 docs/
13. ~~**LOW — Package.json metadata**~~: Fixed (Phase 1.2) — name=commit-ai, version=1.0.0
14. ~~**LOW — RateLimiter unused**~~: Fixed (Phase 1.5) — activated on AI service calls
15. ~~**LOW — localStorage not cleared on logout**~~: Fixed (Phase 3.5) — all 12 keys cleared on signout
16. **LOW — Service role key in migration**: The `notify_jarvis()` trigger function hardcodes the service role JWT in `20260323000002_hardcode_trigger_config.sql` because `ALTER DATABASE SET` is not permitted on Supabase hosted. The repo is private and the key is validated by the `commit-events` Edge Function. Rotate the key periodically via the Supabase dashboard.

## Hard-Won Lessons (from sister projects)

Validated across agent-controller (190 tests) and crm-azteca (1143 tests):

- **Vendor-agnostic inference**: `callLLM()` adapter done (Phase 2.6). Edge Function reads `LLM_MODEL`/`LLM_ENDPOINT`/`LLM_API_KEY` with Groq fallback
- **Parallel AI calls**: `Promise.allSettled()` for independent AI operations. 30-40% speedup measured
- **Graceful fallbacks are correct**: Mock-data-on-missing-key pattern is exactly right. Keep it
- **Schema migrations must be additive**: Never DROP or ALTER existing columns. Add, backfill, deprecate
- **RLS is non-negotiable**: Every table must have user_id + RLS policy. Already done — don't regress
- **Test discipline pays compound interest**: Start with services (mock fetch), then hooks (mock service), then components (mock context)
- **Consolidate retry logic**: One `fetchWithRetry` with exponential backoff + jitter. Never duplicate
- **Secrets never in VITE\_ vars**: Anon key is fine (RLS protects), but Groq key gives full API access
- **ACI over HCI**: Tool descriptions teach the LLM domain hierarchy. Write descriptions as if for a capable but literal junior dev

## Improvement Plan

See `docs/IMPROVEMENT-PLAN.md` for the 6-phase roadmap:

1. ~~Security & Foundation~~ — DONE (2026-03-13)
2. ~~Architecture Refactor~~ — DONE (2026-03-15)
3. ~~Performance & UX~~ — DONE (2026-03-17)
4. ~~Testing Depth~~ — DONE (2026-03-17)
5. ~~Documentation Cleanup~~ — DONE (2026-03-17)
6. Future Enhancements (PWA, undo/redo, soft deletes, E2E) — BACKLOG

### v2.26 Unification (COMMIT + Jarvis)

COMMIT becomes the strategic UI. Jarvis becomes the intelligence engine. Full plan: `mission-control/docs/v2.26-plan.md`.

| Session | Scope                                                                                         | Status   |
| ------- | --------------------------------------------------------------------------------------------- | -------- |
| 1       | Unified data layer (`modified_by`, `agent_suggestions`, `commit-events`, pg_net triggers)     | **Done** |
| 2       | One Brain (ai-proxy Jarvis-first routing, `callLLM()` function_name threading, Groq fallback) | **Done** |
| 3       | Project entity + COMMIT linking (projects table/tools/credential resolution in Jarvis)        | **Done** |
| 4       | Strategic autonomy (event reactor, proactive scanner, conversation→COMMIT, weekly review)     | **Done** |
| 5       | Reliability (token budget, latency tracking, tool audit, response time, observability)        | **Done** |
| 6       | Suggestions panel UI, activity feed, Jarvis badge in TabBar                                   | **Done** |
