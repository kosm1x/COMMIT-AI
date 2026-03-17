# COMMIT-AI Improvement Plan

Audit date: 2026-03-13 | Codebase: 103 TS files, 24.5 KLOC, 14 DB tables
Phase 1 completed: 2026-03-13 | 81 tests, 4 test files, API key secured
Phase 2 completed: 2026-03-15 | Monoliths split, Zod validation, auto-generated types, error toasts
Phase 3 completed: 2026-03-17 | Memoization, pagination, AbortController, accessibility (46 labels), localStorage cleanup

## Executive Summary

v1.0.0 is functional with good architecture fundamentals (RLS, lazy loading, graceful AI fallbacks, i18n). Three critical gaps block production readiness: exposed API key, zero tests, and a 1332-line monolithic state hook. This plan addresses them in priority order across 6 phases.

---

## Phase 1: Security & Foundation (Critical) — DONE

**Goal**: Eliminate the API key exposure and establish testing infrastructure.
**Status**: Completed 2026-03-13. All exit criteria met.

### 1.1 Move AI calls behind Supabase Edge Function — DONE
- Created `supabase/functions/ai-proxy/index.ts` (~160 LOC) — CORS, JWT auth, request validation, language instruction, Groq proxy
- `GROQ_API_KEY` now server-side only (Supabase Edge Function secret)
- Client calls `${VITE_SUPABASE_URL}/functions/v1/ai-proxy` with session Bearer token
- Removed `VITE_GROQ_API_KEY` from env.example, App.tsx setup screen, and aiService.ts
- Mock fallback preserved — null session or proxy error triggers mock data

### 1.2 Add Vitest + React Testing Library — DONE
- Installed vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom
- Configured `test` block in `vite.config.ts` (globals, jsdom, v8 coverage)
- Created `src/test/setup.ts` with jest-dom matchers
- Added `npm run test`, `npm run test:watch`, `npm run test:coverage`
- Fixed package.json: name → `commit-ai`, version → `1.0.0`

### 1.3 First test wave — services & utils — DONE
- `src/utils/security.test.ts` — 28 assertions: escapeHtml, stripHtmlTags, sanitizeInput, validateLength/Title/Description/Email, RateLimiter (fake timers), validateAIResponse, sanitizeAIContent
- `src/utils/fetchWithRetry.test.ts` — 14 assertions: success, retry on 500/429, no retry on 4xx, network error, exhausted retries, AbortSignal, custom retryOn, createRetryFetch
- `src/services/aiService.test.ts` — 15 assertions: analyzeJournalEntry, extractObjectives, generateMindMap, completeIdea (success + mock fallback), rate limiter integration
- `src/services/objectivesService.test.ts` — 12 assertions: Vision/Goal/Objective/Task CRUD via proxy-based Supabase chain mock
- **Actual**: 4 test files, 81 assertions (exceeded target of 40)

### 1.4 Consolidate duplicate fetchWithRetry — DONE
- Deleted duplicate fetchWithRetry from `lib/supabase.ts` (no jitter, no AbortSignal, no custom retryOn)
- Added `supabaseFetch` adapter wrapping canonical `utils/fetchWithRetry.ts`

### 1.5 Activate RateLimiter on AI calls — DONE
- Instantiated `RateLimiter(10, 1)` in aiService.ts
- Gates `callGroqAPI` — returns null when exhausted (triggers existing mock fallback)
- Phase 2.3 will add proper "rate limited" UI messaging

**Exit criteria**: All met — `npm run test` passes (81/81), `VITE_GROQ_API_KEY` not in bundle, rate limiting active.

---

## Phase 2: Architecture Refactor — DONE

**Goal**: Break monolithic hooks, add error handling, improve type safety.
**Status**: Completed 2026-03-15. All exit criteria met.

### 2.1 Split useObjectivesState (1332 LOC → 4 files) — DONE
- `useObjectivesData.ts` (~180 LOC) — state, data fetching, loading, auto-sort, task counts
- `useObjectivesSelection.ts` (~340 LOC) — selection path, resolved selections, orphan lists, visibility, family tree
- `useObjectivesCRUD.ts` (~530 LOC) — all CRUD, toggles, conversions, descendant counts (25+ functions)
- `useObjectivesState.ts` (~200 LOC) — thin composer, backward-compatible `ObjectivesState` interface
- Zero changes required in `Objectives.tsx` consumer

### 2.2 Split IdeaDetail page (1009 LOC → 5 files) — DONE
- `components/ideas/types.ts` (~20 LOC) — `Idea` and `Connection` interfaces
- `hooks/useIdeaEditor.ts` (~280 LOC) — selection tracking, text manipulation, AI transform dispatch
- `components/ideas/SelectionMenu.tsx` (~53 LOC) — positioned context menu overlay
- `components/ideas/ConnectionsSidebar.tsx` (~64 LOC) — connections card with strength bars
- `IdeaDetail.tsx` reduced to ~810 LOC layout orchestrator

### 2.3 User-facing error handling — DONE
- Created `contexts/NotificationContext.tsx` — toast system with auto-dismiss (5-10s by type), max 3 visible, dark mode, slide-up animation
- `NotificationProvider` wraps app in `App.tsx` (inside AuthProvider, outside BrowserRouter)
- Journal page: load/save/delete failures show error toasts via `useNotification()`
- AI mock fallbacks remain **silent** (correct behavior — no user-visible error on graceful fallback)
- Error translation keys added to all 3 i18n files (en/es/zh): `loadFailed`, `saveFailed`, `deleteFailed`, `createFailed`, `updateFailed`

### 2.4 Generate Supabase types — DONE
- Local Supabase started via Docker, all 14 migrations applied
- `npx supabase gen types typescript --local` → `src/lib/database.types.ts` (743 LOC, all 14 tables)
- Removed 290 LOC manual `Database` type from `lib/supabase.ts`
- Client typed: `createClient<Database>()` for full query chain inference
- Updated `objectives/types.ts` to match DB nullability (`description`, `status`, `priority` → `string | null`)
- Fixed ~40 type errors across 22 files at query boundaries (casts) and components (null defaults)
- Added `npm run types:generate` script

### 2.5 Validate AI response schemas (Zod) — DONE
- Added `zod` dependency (~13KB gzipped)
- Created `src/lib/aiSchemas.ts` (~130 LOC) with 11 schemas + `safeParse()` helper
- All 11 JSON-parsing AI functions now validate through Zod with `.catch()` defaults and `.passthrough()`
- Intensity/strength fields clamped to valid ranges, missing fields default gracefully
- On validation failure, falls back to mock generators (existing behavior preserved)

### 2.6 Vendor-agnostic LLM adapter — DONE
- Renamed `callGroqAPI()` → `callLLM()` in `aiService.ts` (13 occurrences)
- Edge Function (`ai-proxy/index.ts`) now reads `LLM_MODEL`, `LLM_ENDPOINT`, `LLM_API_KEY` env vars
- Backward compatible: falls back to `GROQ_API_KEY` and Groq defaults when new vars absent

**Exit criteria**: All met — monoliths split, errors visible to users (Journal toasts), types auto-generated from DB, AI responses validated.

---

## Phase 3: Performance & UX — DONE

**Goal**: Memoize, paginate, and improve accessibility.
**Status**: Completed 2026-03-17. All exit criteria met.

### 3.1 Memoize expensive components — DONE
- Wrapped 4 card components (`VisionCard`, `GoalCard`, `ObjectiveCard`, `TaskCard`) in `React.memo`
- `MindMapView` `renderMermaid` wrapped in `useCallback` with proper deps
- Hooks already had good memoization (useObjectivesSelection: useMemo for lookups/maps; useObjectivesCRUD: useCallback for all CRUD ops)

### 3.2 Add pagination — DONE
- Journal: cursor-based pagination (20 entries per page, "Load More" button in desktop sidebar + mobile BottomSheet)
- Ideas: offset-based pagination (30 ideas per page, "Load More" in grid)
- Added i18n key `common.loadMore` to en/es/zh

### 3.3 AbortController timeout on AI calls — DONE
- `callLLM()` now accepts optional `signal?: AbortSignal` parameter
- Internal 30s timeout via `AbortController` (auto-aborts stale requests)
- External signal support (component unmount cancellation)
- All 12 exported AI functions forward `signal` to `callLLM`
- `fetchWithRetry` already supported `signal` — passed through to `fetch()`
- 2 new test cases: external abort + mid-flight abort

### 3.4 Accessibility pass — DONE
- Created `useFocusTrap` hook (Tab/Shift+Tab cycling, auto-focus, focus restore)
- Modal: focus trap, `role="dialog"`, `aria-modal="true"`, `aria-label={title}`, close button labeled
- BottomSheet: same pattern
- BottomTabBar: `aria-label="Main navigation"`, `aria-current="page"` on active links
- 46 `aria-label` attributes across 12 files (up from 4)
- Icon-only buttons labeled in: 4 card components, Journal, Ideate, MindMapView

### 3.5 Clear preferences on logout — DONE
- `signOut()` clears all 12 localStorage keys (6 global + 6 user-scoped with dynamic suffixes)
- Cleanup runs before `supabase.auth.signOut()` while `user.id` is still available
- Prevents preference leakage between users on shared devices

**Exit criteria**: All met — 46 ARIA labels (was 4), focus traps on Modal/BottomSheet, 4 memoized cards, pagination on Journal (20) and Ideas (30), 30s AI timeout, localStorage cleaned on signout. 83 tests pass.

---

## Phase 4: Testing Depth

**Goal**: Meaningful coverage on critical paths.

### 4.1 Hook tests
- `useObjectivesData.test.ts` — fetch, loading states, error handling
- `useObjectivesSelection.test.ts` — selection path, navigation
- `useObjectivesCRUD.test.ts` — create/update/delete with mocked service
- `useCreativeData.test.ts` — idea loading, connections
- Use `renderHook` from RTL
- **Target**: 4 test files, ~60 assertions

### 4.2 Component tests
- `Button.test.tsx`, `Modal.test.tsx`, `Card.test.tsx` — shared UI components
- `Login.test.tsx` — form validation, submit flow
- `ErrorBoundary.test.tsx` — error capture and display
- **Target**: 5 test files, ~30 assertions

### 4.3 Integration tests
- `Journal.test.tsx` — load entries, create entry, AI analysis flow
- `Objectives.test.tsx` — CRUD flow for vision→goal→objective→task
- Mock Supabase at service boundary
- **Target**: 2 test files, ~20 assertions

### 4.4 CI pipeline
- GitHub Actions workflow: `npm run typecheck && npm run lint && npm run test`
- Run on PR to `main`
- Block merge on failure
- **Files**: `.github/workflows/ci.yml`

**Exit criteria**: >50% line coverage on services/hooks, CI green on every PR.

---

## Phase 5: Documentation Cleanup

**Goal**: Consolidate 18 markdown files into a maintainable set.

### 5.1 Consolidate docs
- Keep: `README.md`, `CLAUDE.md`, `COMMIT_METHOD_GUIDE.md`
- Merge into README: `RELEASE_NOTES.md` (as changelog section), `AI_SERVICE_STATUS.md` (as AI section)
- Merge into single `docs/DEPLOYMENT.md`: `DEPLOYMENT.md`, `DEPLOYMENT_CHECKLIST.md`, `DEPLOYMENT_REVIEW.md`
- Delete: `DROPDOWN_SELECTION_FIX.md`, `FINAL_RESPONSIVE_FIX.md`, `ORPHAN_LINKING_FEATURE.md`, `ORPHAN_LINKING_FIX.md`, `RESPONSIVE_FIX_SUMMARY.md`, `TOGGLE_SELECTION_FEATURE.md` (implementation details belong in git history)
- Move `TECHNICAL_SPECIFICATION.md` to `docs/`

### 5.2 Add missing docs
- `docs/DATABASE-SCHEMA.md` — Mermaid ER diagram (auto-generated from migrations)
- Update `README.md` with current file counts and architecture diagram

### 5.3 Fix package.json metadata — DONE (moved to Phase 1.2)
- ~~Change `name` from `vite-react-typescript-starter` to `commit-ai`~~ Done
- ~~Set `version` to `1.0.0`~~ Done
- Add `description`, `author`, `license` fields

**Exit criteria**: Max 6 markdown files at root, all current and accurate.

---

## Phase 6: Future Enhancements (Backlog)

These are not immediate priorities but should be planned:

| Enhancement | Effort | Impact | Notes |
|---|---|---|---|
| PWA support (offline) | Medium | High | Service worker + IndexedDB cache for offline reads |
| Undo/redo for CRUD ops | Medium | Medium | Transaction queue with 10-item history |
| Soft deletes | Low | Medium | Add `deleted_at` column, filter in queries |
| Virtual scrolling | Low | Medium | react-window for objectives columns |
| Password validation UI | Low | Low | Client-side strength indicator on signup |
| WebAuthn fallback | Medium | Low | Biometric auth for web users |
| Storybook | Medium | Low | Component library documentation |
| E2E tests (Playwright) | High | High | Critical user flows |
| Push notifications | Medium | High | Capacitor push plugin + Supabase webhook |
| Composite DB indexes | Low | Medium | `(user_id, status)`, `(user_id, due_date)` |

---

## Metrics

Track these to measure improvement:

| Metric | Pre-Phase 1 | Phase 1 Actual | Phase 2 Actual | Phase 3 Actual | Phase 4 Target |
|---|---|---|---|---|---|
| Test files | 0 | **4** | **4** | **4** | 15+ |
| Test assertions | 0 | **81** | **81** | **83** | 150+ |
| Line coverage | 0% | ~15% | ~15% | ~15% | 50%+ |
| Max file LOC | 1841 (aiService) | 1841 | 1841 | 1841 | <600 |
| `any` / `@ts-ignore` | 71 | 71 | ~60 | ~60 | <20 |
| ARIA labels | 4 | 4 | 4 | **46** | 40+ |
| Focus traps | 0 | 0 | 0 | **2 (Modal, BottomSheet)** | 2 |
| Memoized cards | 0 | 0 | 0 | **4** | 4 |
| Pagination | None | None | None | **Journal (20), Ideas (30)** | Done |
| AI timeout | None | None | None | **30s hard limit** | Done |
| localStorage leak | Yes | Yes | Yes | **Fixed** | Fixed |
| Client-side secrets | 1 (Groq key) | **0** | **0** | **0** | 0 |
| Duplicate code | fetchWithRetry x2 | **0** | **0** | **0** | 0 |
| Manual DB types | 290 LOC / 8 tables | 290 LOC | **0 LOC / 14 tables auto-generated** | **0** | 0 |
| AI response validation | None | None | **11 Zod schemas** | **11** | 11 |
| Error toasts | None | None | **Journal (load/save/delete)** | **Journal** | All pages |
