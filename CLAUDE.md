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
- **Database**: Self-hosted Supabase on VPS — PostgreSQL 15 + GoTrue Auth + PostgREST + Edge Runtime (RLS on all 16 tables)
- **AI**: Groq API (Qwen 3.2) via Supabase Edge Function (`ai-proxy`) — key is server-side, vendor-agnostic via `LLM_MODEL`/`LLM_ENDPOINT` env vars
- **Validation**: Zod schemas for all 11 AI response types (`src/lib/aiSchemas.ts`)
- **Mobile**: Capacitor 8 (iOS + Android)
- **Diagrams**: Mermaid 11 (mind maps)
- **Push**: Capacitor Local Notifications (native) + PWA Service Worker (web)
- **Infra**: Self-hosted at `db.mycommit.net` via Caddy (TLS) → Kong → GoTrue/PostgREST/Edge Runtime. Daily pg_dump backups

## Architecture

```
src/
  App.tsx                        # Router + context providers (Language > Theme > Auth > Notification > Undo > BrowserRouter)
  pages/                         # 7 lazy-loaded route components + Login (direct import)
    IdeaDetail.tsx               # Layout orchestrator (split in Phase 2.2)
  components/                    # 60+ components in domain folders:
    ideas/                       #   types.ts, SelectionMenu.tsx, ConnectionsSidebar.tsx
    journal/, objectives/,       #   cards/, columns/, modals/ subfolders
    map/, tracking/,             #   widgets/ subfolder
    suggestions/                 #   SuggestionsPanel, SuggestionCard, SuggestionsBadge, ActivityFeed
    onboarding/                  #   OnboardingBanner (collapsible 7-day progress)
    navigation/, layout/, ui/
  contexts/                      # AuthContext, ThemeContext, LanguageContext, NotificationContext, UndoContext
  hooks/                         # 14 custom hooks
    useObjectivesState.ts        # Thin composer (split in Phase 2.1)
    useObjectivesData.ts         # Data loading + state
    useObjectivesSelection.ts    # Selection path + navigation
    useObjectivesCRUD.ts         # CRUD + toggles + conversions
    useIdeaEditor.ts             # Text selection + AI transforms
    useFocusTrap.ts              # Tab cycling + focus restore for modals
    useAgentSuggestions.ts       # Jarvis suggestions state + accept/reject
    useOnboarding.ts             # 7-day time-gated onboarding state machine
    useNotificationScheduler.ts  # Push notification lifecycle management
  services/                      # 9 services
    aiService.ts                 # Barrel re-export for 12 AI functions (split into ai/ modules)
    ai/                          #   callLLM, journal, mindmap, ideas, strategic, analysis, objectives, userContext
    objectivesService.ts         # CRUD for Vision/Goal/Objective/Task
    suggestionsService.ts        # CRUD for agent_suggestions (Jarvis proposals)
    notificationScheduler.ts     # Local + web notification scheduling
    nativePlatformService.ts     # Capacitor platform detection + native APIs
  lib/
    supabase.ts                  # Typed client: createClient<Database>()
    database.types.ts            # Auto-generated from DB (npm run types:generate)
    aiSchemas.ts                 # Zod schemas for all AI response types
  utils/                         # fetchWithRetry, security, trackingStats, autoSort, familyTree
  i18n/                          # en.ts, es.ts, zh.ts
  config/navigation.ts           # Nav structure
supabase/
  migrations/                    # 27 SQL migrations (additive only)
  functions/ai-proxy/            # Edge Function: vendor-agnostic LLM proxy
  functions/commit-events/       # Edge Function: DB webhook → Jarvis event bridge
  functions/push-notify/         # Edge Function: server-side push notification delivery
  config.toml                    # Local Supabase config (for types:generate)
docs/                            # Improvement plan, deployment, tech spec
```

### Data hierarchy

Vision > Goal > Objective > Task (4-level). Each level has nullable FK to parent (orphaned items supported). Status: `not_started | in_progress | completed | on_hold`. Priority: `high | medium | low`. Task pruning is delegated to Jarvis.

### Database tables (16)

`journal_entries`, `ai_analysis`, `visions`, `goals`, `objectives`, `tasks`, `task_completions`, `ideas`, `idea_connections`, `idea_ai_suggestions`, `mind_maps`, `user_preferences`, `daily_plans`, `daily_plan_tasks`, `agent_suggestions`, `push_tokens`. All have `user_id` FK with CASCADE DELETE + RLS policies for SELECT/INSERT/UPDATE/DELETE. The 4 hierarchy tables + `journal_entries` have `modified_by` provenance tracking (`user`/`jarvis`/`system`). `user_preferences` has notification columns: `notify_journal_reminder`, `notify_streak_alert`, `notify_task_due`, `notify_weekly_digest`, `reminder_hour`, `timezone`, plus onboarding columns: `onboarding_day`, `onboarding_started_at`, `onboarding_completed_at`, plus `ai_feedback` JSONB.

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
VITE_SUPABASE_URL=https://db.mycommit.net
VITE_SUPABASE_ANON_KEY=...
# --- Edge Function secrets (self-hosted: /opt/supabase/.env on VPS) ---
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
6. ~~Future Enhancements~~ — 4 done (indexes, password UI, E2E, undo/redo), 1 skipped (virtual scrolling), 2 remaining (WebAuthn, Storybook). PWA + push done in v4.0

### Jarvis Integration — COMPLETE (v2.26 unification + v3.0 hardening)

COMMIT = strategic UI. Jarvis = intelligence engine. Unified data layer, Jarvis-first AI routing with Groq fallback, event-driven reactions, suggestions panel UI, structured logging (Pino), 3-layer tool guardrails, provider rotation. Details: `mission-control/docs/PROJECT-STATUS.md`.

### v4.0 Retention — COMPLETE (all 5 sessions)

1. ~~Honest AI~~ — `AIResult<T>` discriminated unions, contextual AI engine, feedback tracking
2. ~~Guided Onboarding~~ — 7-day time-gated flow, empty states, progressive disclosure, Settings page
3. ~~Push Notifications~~ — Capacitor local + PWA service worker + Edge Function delivery + Settings UI
4. ~~Weekly Digest & Insights~~ — InsightsCard, streak celebrations, weekly-digest Edge Function + LLM insights
5. ~~Quick Wins~~ — Persist idea connections to DB, full data export (JSON + Markdown)

Details: `docs/V4-IMPLEMENTATION-PLAN.md`. Project overview: `docs/PROJECT-OVERVIEW.md`.

### v4.1 Intelligence — COMPLETE

Feedback-adapted AI prompts, pattern detection, compounding insights. System prompt now includes behavioral patterns (most productive/reflective day, emotion trends, consecutive improvement weeks) and AI feedback preferences (acceptance ratios per function type). Weekly digest enriched with 4-week historical trends and pattern-aware LLM prompts. InsightsCard surfaces detected patterns.

Details: `docs/V4-IMPLEMENTATION-PLAN.md`. Project overview: `docs/PROJECT-OVERVIEW.md`.
