# COMMIT-AI Engineering Improvement Plan — Post v4.1 Audit

> **Sprint 1 — DONE** (10e4b1e): Listener leak, XSS, LLM timeout, upsert error check, RLS policy
> **Sprint 2 — DONE** (77e76b7): Stale types, N+1 elimination, content keys, ErrorBoundary, composite indexes, query limits, task upsert

## Context

v4.0 + v4.1 shipped. Development paused for real-world usage. Three parallel audit agents reviewed the entire system: frontend code quality, backend/infrastructure, and UX/testing. 60+ findings across security, performance, testing, and polish. This plan prioritizes and sequences them for systematic improvement.

## Findings Summary

| Severity | Count | Key Areas                                                                     |
| -------- | ----- | ----------------------------------------------------------------------------- |
| CRITICAL | 6     | Memory leak, XSS vector, missing timeout, test coverage 8.6%, no skeletons    |
| HIGH     | 13    | N+1 queries, race conditions, stale types, no optimistic updates, mobile gaps |
| MEDIUM   | 13    | Missing indexes, stale closures, ESLint gaps, backup retention                |
| LOW      | 7     | Unused code, hardcoded strings, a11y tooling                                  |

## Sprint 1: Security & Stability (Critical Fixes)

Small, high-impact fixes. Each is 30 min to 2 hours.

### 1.1 MindMapView event listener memory leak

**File:** `src/components/map/MindMapView.tsx` (lines 160-187)
**Issue:** `addNodeClickHandlers()` adds listeners on every render without removing previous ones.
**Fix:** Store refs, remove before re-adding, cleanup in useEffect return.

### 1.2 MindMapView innerHTML XSS

**File:** `src/components/map/MindMapView.tsx` (lines 147, 152, 156)
**Issue:** Direct `innerHTML` from Mermaid SVG output. If Mermaid output is compromised, XSS.
**Fix:** Use DOMPurify to sanitize SVG before insertion, or use `textContent` for plain text.

### 1.3 ai-proxy missing LLM timeout

**File:** `supabase/functions/ai-proxy/index.ts` (lines 189-229)
**Issue:** LLM fetch has no timeout. Jarvis fallback has 25s, but direct LLM call can hang indefinitely.
**Fix:** Add `signal: AbortSignal.timeout(30_000)` to the fetch.

### 1.4 weekly-digest silent upsert failure

**File:** `supabase/functions/weekly-digest/index.ts` (line 189)
**Issue:** Upsert result not checked. Silent data loss if insert fails.
**Fix:** Check `{ error }` from upsert, log with user context.

### 1.5 Silent error swallowing

**Files:** Journal.tsx (line 199), AuthContext.tsx (lines 83-87, 130-133)
**Issue:** `.catch(() => {})` patterns silently swallow errors.
**Fix:** Replace with `.catch((err) => logger.warn(...))`.

### 1.6 agent_suggestions UPDATE policy gap

**File:** `supabase/migrations/20260323000000_unified_data_layer.sql`
**Issue:** UPDATE policy lacks `WITH CHECK (auth.uid() = user_id)` — allows changing user_id.
**Fix:** New migration adding WITH CHECK clause.

## Sprint 2: Performance & Resilience

### 2.1 Regenerate database.types.ts

**File:** `src/lib/database.types.ts`
**Issue:** 6+ columns added by migrations not in types. All those `as Record<string, unknown>` casts exist because of this.
**Fix:** Run `supabase gen types typescript` against self-hosted DB, or manually add all missing columns.

### 2.2 N+1 query in getVisionDescendantCounts

**File:** `src/hooks/useObjectivesCRUD.ts` (lines 181-214)
**Issue:** 1 query for goals, then N queries for objectives per goal.
**Fix:** Single query with aggregation or join.

### 2.3 Index-based keys in AIAssistantPanel

**File:** `src/components/AIAssistantPanel.tsx` (lines 541, 641, 764, 783)
**Issue:** `key={index}` in lists. State identity lost on reorder.
**Fix:** Use `key={item.title + item.approach}` or generate stable IDs.

### 2.4 Add ErrorBoundary for lazy AIAssistantPanel

**File:** `src/pages/IdeaDetail.tsx` (lines 16-17)
**Issue:** Lazy-loaded panel wrapped in Suspense but not ErrorBoundary.
**Fix:** Wrap in `<ErrorBoundary section="AI Assistant">`.

### 2.5 Add missing database indexes

**New migration.** Composite indexes for common query patterns:

- `tasks(status, due_date)` — used by push-notify
- `objectives(goal_id, status)` — used by GoalsKanban
- `agent_suggestions(user_id, resolved_at DESC)` — used by loadRecent

### 2.6 Push-notify unbounded query

**File:** `supabase/functions/push-notify/index.ts` (lines 49-55)
**Issue:** No LIMIT on user preferences query. 100k users = OOM.
**Fix:** Add `.limit(500)` + cursor-based pagination.

### 2.7 Export function unbounded

**File:** `src/services/exportService.ts` (line 24)
**Issue:** Exports all data with no limit. Users with 10k entries = browser crash.
**Fix:** Add `.limit(5000)` per table or stream with pagination.

### 2.8 Notification scheduler web checker leak

**File:** `src/services/notificationScheduler.ts` (lines 89-114)
**Issue:** `startWebChecker()` can create multiple intervals if called repeatedly.
**Fix:** Call `stopWebChecker()` before `startWebChecker()`.

### 2.9 Race condition in task completion toggles

**File:** `src/services/objectivesService.ts` (lines 426-464)
**Issue:** Non-atomic check-then-insert. Concurrent clicks = duplicates.
**Fix:** Use upsert with ON CONFLICT or database-level constraint.

## Sprint 3: Testing Foundation

### 3.1 Utility tests — streakCalculator, patternDetector, familyTree

**Files:** `src/utils/streakCalculator.ts`, `patternDetector.ts`, `familyTree.ts`
**Why:** Core math/logic with zero tests. Easy to test, high value.

### 3.2 Service tests — notificationScheduler, exportService, ideaConnectionService

**Files:** `src/services/notificationScheduler.ts`, `exportService.ts`, `ideaConnectionService.ts`
**Why:** New v4.0 services with zero tests. Mock Supabase, test logic.

### 3.3 Hook tests — useOnboarding, useStreakCelebration, useNotificationScheduler

**Files:** `src/hooks/useOnboarding.ts`, `useStreakCelebration.ts`, `useNotificationScheduler.ts`
**Why:** New v4.0 hooks with state machines and side effects.

### 3.4 Page-level E2E tests

**Files:** `e2e/` — currently only 2 test files (auth + navigation)
**Add:** Journal create + AI analysis, Objectives hierarchy, Settings export, Idea connections persistence.

### 3.5 i18n build validation

Add a build step or test that verifies all 3 language files have identical key sets.

### 3.6 ESLint improvements

**File:** `eslint.config.js`
**Add:** `eslint-plugin-jsx-a11y`, `eslint-plugin-import` (unused imports/dead code detection).

## Sprint 4: Polish & UX

### 4.1 Skeleton loading screens

**Files:** Objectives.tsx, Journal.tsx, Ideate.tsx, IdeaDetail.tsx
**Issue:** Full-screen spinner while data loads. No skeleton layout.
**Fix:** Add skeleton cards matching the target layout. Show immediately, replace when data arrives.

### 4.2 Optimistic updates on mutations

**Files:** `useObjectivesCRUD.ts`, Journal save, Idea save
**Issue:** UI waits for server response (500ms-2s) before reflecting changes.
**Fix:** Update local state immediately, rollback on error.

### 4.3 Status enum constants

**Multiple files.** Replace hardcoded `"not_started"`, `"in_progress"` strings with a shared `STATUS` const object. Safer refactoring, better autocomplete.

### 4.4 Mobile 320px audit

Test all pages at 320px width. Fix horizontal overflow, tap target sizes, text truncation.

### 4.5 Accessibility improvements

- Add `eslint-plugin-jsx-a11y` to ESLint (Sprint 3.6)
- Fix color-only status indicators (add text labels)
- Fix focus restoration on modal/BottomSheet close
- Add `aria-describedby` on drag-and-drop elements

### 4.6 Backup strategy improvement

**File:** `/opt/supabase/backup.sh`
**Fix:** Increase retention to 90 days. Add a weekly off-site copy. Add monitoring (alert if no backup in 7 days).

### 4.7 Logger production suppression

**File:** `src/utils/logger.ts`
**Fix:** Suppress `info` and `debug` in production. Only emit `warn` and `error`.

## Implementation Order

```
Sprint 1 (Security) ← Do first, small and critical
  1.1-1.6 — all independent, can be done in any order

Sprint 2 (Performance) ← After Sprint 1
  2.1 first (types), then others in any order

Sprint 3 (Testing) ← Parallel with Sprint 2
  3.1-3.3 unit tests (can run concurrently)
  3.4 E2E tests (after unit tests stabilize)
  3.5-3.6 tooling improvements

Sprint 4 (Polish) ← After Sprints 2-3
  4.1-4.2 are the highest-value UX improvements
  4.3-4.7 are cleanup and hardening
```

## Scope

- **Sprint 1:** ~6 tasks, ~4-6 hours total
- **Sprint 2:** ~9 tasks, ~8-12 hours total
- **Sprint 3:** ~6 tasks, ~12-16 hours total (test writing is time-intensive)
- **Sprint 4:** ~7 tasks, ~8-12 hours total

**Total: ~35 tasks, ~32-46 hours of focused work across 4 sprints.**

Not all need to happen before v4.2. Sprints 1-2 should happen before any new feature work. Sprint 3 can run in parallel with usage/testing. Sprint 4 is polish that can happen whenever.
