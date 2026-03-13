# COMMIT-AI

Personal growth companion implementing the COMMIT framework (Context, Objectives, MindMap, Ideate, Track). React SPA with Supabase backend and Groq AI.

## Commands

```bash
npm run dev          # Vite dev server on :5000
npm run build        # Typecheck + Vite production build
npm run typecheck    # tsc --noEmit -p tsconfig.app.json
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run test         # Vitest (81 tests, 4 files)
npm run test:watch   # Vitest watch mode
npm run test:coverage # Vitest with v8 coverage
```

## Stack

- **Frontend**: React 18 + TypeScript 5.5 + Vite 5 + Tailwind 3
- **Database**: Supabase (PostgreSQL + RLS on all 14 tables + Auth)
- **AI**: Groq API (Qwen 3.2) via Supabase Edge Function (`ai-proxy`) — key is server-side
- **Mobile**: Capacitor 8 (iOS + Android)
- **Diagrams**: Mermaid 11 (mind maps)
- **No custom backend** — Supabase Edge Functions for AI proxy, browser for everything else

## Architecture

```
src/                             # 103 files, 24.5 KLOC
  App.tsx                        # Router + context providers (Language > Theme > Auth > BrowserRouter)
  pages/                         # 8 lazy-loaded route components
    IdeaDetail.tsx               # 1009 LOC — needs split (Phase 2.2)
  components/                    # 57 components in domain folders:
    journal/, objectives/,       #   cards/, columns/, modals/ subfolders
    map/, tracking/,             #   widgets/ subfolder
    navigation/, layout/, ui/
  contexts/                      # AuthContext (182), ThemeContext (78), LanguageContext (97)
  hooks/                         # 6 custom hooks
    useObjectivesState.ts        # 1332 LOC — needs split (Phase 2.1)
  services/                      # 6 services
    aiService.ts                 # 1841 LOC, 9 AI functions via callGroqAPI()
    objectivesService.ts         # CRUD for Vision/Goal/Objective/Task
  utils/                         # fetchWithRetry, security, trackingStats, autoSort, familyTree
  lib/supabase.ts                # Client init + 290 LOC manual DB types (should be generated)
  i18n/                          # en.ts, es.ts, zh.ts (548 LOC each)
  config/navigation.ts           # Nav structure
supabase/migrations/             # 14 SQL migrations (additive only)
docs/                            # Improvement plan, deployment, tech spec
```

### Data hierarchy

Vision > Goal > Objective > Task (4-level). Each level has nullable FK to parent (orphaned items supported). Status: `not_started | in_progress | completed | on_hold`. Priority: `high | medium | low`.

### Database tables (14)

`journal_entries`, `ai_analysis`, `visions`, `goals`, `objectives`, `tasks`, `task_completions`, `ideas`, `idea_connections`, `idea_ai_suggestions`, `mind_maps`, `user_preferences`, `daily_planner`, `daily_plan_tasks`. All have `user_id` FK with CASCADE DELETE + RLS policies for SELECT/INSERT/UPDATE/DELETE.

### AI service (`src/services/aiService.ts`)

9 functions via `callGroqAPI()`: `analyzeJournalEntry`, `extractObjectivesFromJournal`, `generateMindMap`, `completeIdea`, `findIdeaConnections`, `generateDivergentPaths`, `suggestNextSteps`, `generateCriticalAnalysis`, `generateRelatedConcepts`. All return mock data when API key missing.

### Auth flow

Supabase Auth (email/password). `AuthContext` manages session + syncs `user_preferences` on sign-in. Biometric auth via Capacitor plugin on native platforms.

## Conventions

- **Lazy loading**: All pages use `React.lazy()` + `<Suspense>` + `<ErrorBoundary>`
- **State**: React Context (no Redux/Zustand). Domain logic in custom hooks, not components
- **Styling**: Tailwind utility classes. Dark mode via `dark:` variant + HTML class toggle. No hardcoded colors — use Tailwind palette
- **i18n**: `useLanguage().t('key')` — all user-visible strings must use translation keys, never hardcoded English
- **Fetch**: `fetchWithRetry()` with exponential backoff (utils version is canonical — do NOT create new retry logic)
- **Types**: Database types manually defined in `lib/supabase.ts` (Phase 2.4 will auto-generate)
- **Env vars**: `VITE_` prefix required (Vite convention). Access via `import.meta.env`
- **Error handling**: Never swallow errors silently. Show user-facing feedback for all async failures
- **Accessibility**: Every interactive element needs `aria-label`. Every image needs `alt`. Modals need focus trap
- **File size**: No single file should exceed 600 LOC. Split into focused units before it grows
- **Migrations**: Additive only. Never DROP or ALTER existing columns

## Environment

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
# GROQ_API_KEY is server-side only (Supabase Edge Function secret)
```

## Known Issues (prioritized)

1. ~~**CRITICAL — API key exposed client-side**~~: Fixed (Phase 1.1) — moved to Edge Function
2. ~~**CRITICAL — Zero tests**~~: Fixed (Phase 1.2-1.3) — 81 tests via Vitest
3. **HIGH — Monolithic state hook**: `useObjectivesState.ts` at 1332 LOC, 80+ functions → Phase 2.1
4. **HIGH — No error UI**: Async failures logged to console, user sees nothing → Phase 2.3
5. **HIGH — No AI response validation**: Groq JSON parsed without schema check → Phase 2.5
6. ~~**MEDIUM — Duplicate fetchWithRetry**~~: Fixed (Phase 1.4) — consolidated to canonical utils version
7. **MEDIUM — Manual DB types**: 290 LOC hand-written, drift risk → Phase 2.4
8. **MEDIUM — No memoization**: Cards/widgets re-render on every parent change → Phase 3.1
9. **MEDIUM — No pagination**: Full list loads (Journal 30, Ideas 100) → Phase 3.2
10. **MEDIUM — Missing accessibility**: Only 4 ARIA labels across 57 components → Phase 3.4
11. **LOW — 71 `any`/`@ts-ignore` instances**: Type safety gaps throughout
12. **LOW — 18 markdown files at root**: Documentation sprawl → Phase 5.1
13. ~~**LOW — Package.json metadata**~~: Fixed (Phase 1.2) — name=commit-ai, version=1.0.0
14. ~~**LOW — RateLimiter unused**~~: Fixed (Phase 1.5) — activated on AI service calls
15. **LOW — localStorage not cleared on logout**: Preferences leak between users → Phase 3.5

## Hard-Won Lessons (from sister projects)

Validated across agent-controller (190 tests) and crm-azteca (1143 tests):

- **Vendor-agnostic inference**: `callLLM(messages, opts)` adapter targeting any OpenAI-compatible endpoint. Current `callGroqAPI` is close — generalize endpoint + model config
- **Parallel AI calls**: `Promise.allSettled()` for independent AI operations. 30-40% speedup measured
- **Graceful fallbacks are correct**: Mock-data-on-missing-key pattern is exactly right. Keep it
- **Schema migrations must be additive**: Never DROP or ALTER existing columns. Add, backfill, deprecate
- **RLS is non-negotiable**: Every table must have user_id + RLS policy. Already done — don't regress
- **Test discipline pays compound interest**: Start with services (mock fetch), then hooks (mock service), then components (mock context)
- **Consolidate retry logic**: One `fetchWithRetry` with exponential backoff + jitter. Never duplicate
- **Secrets never in VITE_ vars**: Anon key is fine (RLS protects), but Groq key gives full API access
- **ACI over HCI**: Tool descriptions teach the LLM domain hierarchy. Write descriptions as if for a capable but literal junior dev

## Improvement Plan

See `docs/IMPROVEMENT-PLAN.md` for the 6-phase roadmap:
1. Security & Foundation (critical fixes, testing infra)
2. Architecture Refactor (split monoliths, error handling, type generation)
3. Performance & UX (memoization, pagination, accessibility)
4. Testing Depth (hooks, components, integration, CI)
5. Documentation Cleanup (consolidate 18 files → 6)
6. Future Enhancements (PWA, undo/redo, soft deletes, E2E)
