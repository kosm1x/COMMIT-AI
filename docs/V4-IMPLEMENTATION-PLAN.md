# v4.0 Implementation Plan — Retention

## Context

COMMIT-AI has shipped all core features (Phases 1-6) and Jarvis integration (v2.26 + v3.0). A product audit revealed three structural weaknesses: (1) AI is stateless and silently returns fake data on failure, (2) no retention mechanics (no push, no guided onboarding, no streak rewards), (3) tracking shows raw numbers without interpretation. v4.0 addresses all three under the theme "make the habit stick." North star: `docs/NORTH-STAR.md`. Technical spec: `docs/V4-TECHNICAL-PLAN.md`.

## Decisions (resolved)

1. **AI failure return type**: Discriminated union `AIResult<T> = { status: 'ok'; data: T } | { status: 'unavailable' }`. Every AI function adopts this return type. Callers pattern-match on `status`.
2. **WelcomeModal**: Keep for step 0 (first login only). Remove language-change re-trigger. Available on-demand after that (e.g., help menu).
3. **Onboarding advancement**: Auto-advance when criteria met. Success toast confirms: "Step complete! Next: [next step description]."
4. **Settings page**: New `/settings` route. Houses notification preferences, data export, timezone, "Show COMMIT Guide" link, and existing theme/language toggles.
5. **Onboarding banner**: Collapsible — small pill on mobile (shows step + pillar badge), full bar on desktop. Non-blocking, scrolls with content.
6. **AI unavailable component**: Shared `src/components/ui/AIUnavailable.tsx` created in Session 1 before any page touches. Ensures consistent treatment across 5+ pages.

---

## Session 1: Honest AI

**Goal:** Production AI calls return discriminated union on failure (not fake data). AI prompts include user context. Accept/reject feedback is tracked.

### 1A. Discriminated union return type + gate mock fallbacks — DONE (03ccae4)

> 19 files, 492 insertions. AIResult<T> type, 8 functions wrapped, AIUnavailable component, all consumers + tests updated. QA audit passed.

**New shared type** in `src/services/ai/callLLM.ts`:

```typescript
export type AIResult<T> = { status: "ok"; data: T } | { status: "unavailable" };
export const aiUnavailable: { status: "unavailable" } = {
  status: "unavailable",
};
```

**Files to modify:**

| File                            | Change                                                                                                                                                                                                                                                | Est.      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `src/services/ai/journal.ts`    | Gate `generateMockAnalysis()` calls (lines 50, 58, 79, 82) behind `import.meta.env.DEV`. Production returns `aiUnavailable`. Success paths wrap in `{ status: 'ok', data }`. Return types change to `AIResult<T>`.                                    | ~10 lines |
| `src/services/ai/mindmap.ts`    | Gate `generateMockMindMap()` (lines 65, 86). Production returns `aiUnavailable`. Success paths wrap in `{ status: 'ok', data }`. Return types change to `AIResult<T>`.                                                                                | ~6 lines  |
| `src/services/ai/ideas.ts`      | Gate `generateMockIdeaCompletion()` (lines 58, 82). Leave `findIdeaConnections` fallback to `findSimilarIdeasFallback` (keyword matching is genuinely useful, not fake). Leave `transformIdeaText` as-is (returns original text on failure — honest). | ~6 lines  |
| `src/services/ai/strategic.ts`  | Gate `generateMockDivergentPaths()` (lines 59, 71) and `generateMockNextSteps()` (lines 217, 229).                                                                                                                                                    | ~12 lines |
| `src/services/ai/analysis.ts`   | Gate `generateMockCriticalAnalysis()` (lines 58, 70, 73) and `generateMockRelatedConcepts()` (lines 198, 210, 213).                                                                                                                                   | ~12 lines |
| `src/services/ai/objectives.ts` | Gate `generateMockObjectives()` (lines 63, 74) and `generateMockTasks()` (lines 216, 229).                                                                                                                                                            | ~12 lines |

**No changes needed:**

- `extractObjectivesFromJournal` — already returns `[]` on failure (honest)
- `transformIdeaText` — already returns original text on failure (honest)
- `findIdeaConnections` — fallback to keyword matching is legitimate, not fake

**UI "unavailable" states — files to modify:**

| File                                  | Change                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/Journal.tsx`               | Check `result.status === 'unavailable'` → show "AI analysis unavailable" card with retry button. On `'ok'` → show emotion bars as before. |
| `src/components/AIAssistantPanel.tsx` | Each tool handler checks `status`. `'unavailable'` → show message + retry button in panel. `'ok'` → render results as before.             |
| `src/components/map/MindMapView.tsx`  | `'unavailable'` → show inline message instead of blank area.                                                                              |
| `src/pages/Ideate.tsx`                | `'unavailable'` → error toast via NotificationContext.                                                                                    |
| `src/pages/Objectives.tsx`            | `'unavailable'` → inline message under suggest buttons.                                                                                   |

**New shared component:** `src/components/ui/AIUnavailable.tsx` (~40 LOC)

```typescript
interface AIUnavailableProps {
  onRetry?: () => void;
  compact?: boolean; // true for inline use (panels), false for card use (pages)
}
```

- Renders: cloud-off icon, "AI analysis unavailable" message, optional "Try again" button
- Compact mode: single line with icon + text + retry link (for AIAssistantPanel sections)
- Full mode: centered card with icon, message, detail text, retry button (for Journal, MindMap)
- Dark mode aware, uses existing Tailwind palette
- All text via i18n

**i18n:** Add keys to `en.ts`, `es.ts`, `zh.ts`: `ai.unavailable`, `ai.retry`, `ai.unavailableDetail`.

**Tests:**

- Update `src/services/aiService.test.ts` — mock `import.meta.env.DEV = false`, assert `{ status: 'unavailable' }` returns
- Add test: DEV mode still returns `{ status: 'ok', data: mockData }` (development experience preserved)
- Re-export `AIResult` type from `src/services/aiService.ts` barrel file

### 1B. Contextual AI Engine

**New file:** `src/services/ai/userContext.ts` (~120 LOC)

The contextual AI engine queries the user's real data before each AI call and injects it as a **system prompt** so the LLM treats it as persistent context, not part of the question.

```typescript
interface UserAIContext {
  recentJournalEntries: {
    content: string;
    date: string;
    primaryEmotion?: string;
  }[]; // last 7 days
  activeObjectives: { title: string; status: string; progress: number }[]; // active goals/objectives
  taskSummary: {
    completedThisWeek: number;
    pendingThisWeek: number;
    total: number;
  }; // weekly snapshot
  streakDays: number;
  preferredLanguage: string;
  aiFeedback?: {
    accepted: Record<string, number>;
    rejected: Record<string, number>;
  };
}

export async function buildUserContext(
  userId: string,
): Promise<UserAIContext | null>;
export function formatContextAsSystemPrompt(ctx: UserAIContext): string;
export function invalidateContextCache(userId: string): void;
```

**Queries** (4 parallel SELECTs via `Promise.all`):

1. `journal_entries` — last 7 days, content + created_at + join `ai_analysis` for primary_emotion
2. `goals` + `objectives` — where status != 'completed', with child task counts for progress %
3. `tasks` — completed this week (completed_at >= Monday) vs pending (status != 'completed', due this week)
4. `user_preferences` — ai_feedback JSONB (from 1C)

**Cache:** 1-hour TTL in module-scope Map keyed by userId. `invalidateContextCache(userId)` for explicit bust on writes (journal save, task completion).

**System prompt format:**

```
You are assisting a user with their personal growth journey. Here is their current context:

## Recent Journal (last 7 days)
- Apr 1: "Feeling focused after morning routine..." (primary emotion: Focused)
- Mar 30: "Stressed about the deadline..." (primary emotion: Anxious)

## Active Goals & Progress
- "Learn Spanish" — 3/5 objectives complete (60%)
- "Run a marathon" — 1/4 objectives complete (25%)

## This Week
- Tasks completed: 8
- Tasks pending: 3
- Current streak: 12 days

Use this context to personalize your responses. Reference the user's goals, emotions, and progress where relevant.
```

**Modify:** `src/services/ai/callLLM.ts`

- Add optional parameter: `systemPrompt?: string`
- Pass as separate `system` message to the Edge Function (not prepended to user prompt)
- Edge Function already sends `messages[]` — add `{ role: 'system', content: systemPrompt }` before the user message

**Modify:** `supabase/functions/ai-proxy/index.ts`

- Accept optional `system_prompt` field in request body
- If present, prepend as `{ role: 'system', content }` in the messages array sent to LLM
- Jarvis routing: pass system_prompt in the `context` field

**Modify callers** (6 files, ~3 lines each):

- `journal.ts`, `ideas.ts`, `strategic.ts`, `analysis.ts`, `objectives.ts`, `mindmap.ts`
- Pattern:
  ```typescript
  const session = await supabase.auth.getSession();
  const ctx = await buildUserContext(session?.data.session?.user?.id ?? '');
  const systemPrompt = ctx ? formatContextAsSystemPrompt(ctx) : undefined;
  callLLM(prompt, ..., systemPrompt);
  ```

**Tests:** New `src/services/ai/userContext.test.ts` — mock Supabase queries, assert context shape, assert 1-hour cache, assert invalidation, assert system prompt formatting.

### 1C. AI feedback tracking

**Migration:** `supabase/migrations/20260401000001_ai_feedback.sql`

```sql
ALTER TABLE user_preferences ADD COLUMN ai_feedback jsonb DEFAULT '{}';
```

**Modify:** `src/services/userPreferencesService.ts`

- Add `updateAIFeedback(userId: string, functionType: string, accepted: boolean): Promise<void>`
- Reads current `ai_feedback`, increments `accepted_types[type]` or `rejected_types[type]`, writes back
- Uses Supabase RPC or direct update with JSONB merge

**Modify:** `src/components/AIAssistantPanel.tsx`

- "Save as Idea" button (line 492): call `updateAIFeedback(userId, 'divergent_paths', true)`
- "Create Task" button (line 600): call `updateAIFeedback(userId, 'next_steps', true)`
- Add "Not helpful" dismiss button to each panel section → `updateAIFeedback(userId, type, false)`
- Import userPreferencesService, get userId from AuthContext

**Modify:** `src/services/ai/userContext.ts` — include `ai_feedback` in context (loaded from user_preferences)

**Tests:** Test `updateAIFeedback` increments correctly, test round-trip.

**Dependencies:** None. Session 1 is self-contained.

---

## Session 2: Guided Onboarding

**Goal:** 7-day time-gated onboarding that builds a daily habit while teaching the full COMMIT framework. One step per day — unlocked by time, completed by action. Empty states on every page. Progressive disclosure of hierarchy.

### 2A. Onboarding state machine

**Migration:** `supabase/migrations/20260401000002_onboarding.sql`

```sql
ALTER TABLE user_preferences ADD COLUMN onboarding_day integer DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN onboarding_started_at timestamptz;
ALTER TABLE user_preferences ADD COLUMN onboarding_completed_at timestamptz;
```

**New file:** `src/hooks/useOnboarding.ts` (~150 LOC)

```typescript
interface UseOnboardingReturn {
  day: number; // 0-7 (0 = welcome, 1-7 = active days)
  isActive: boolean; // day <= 7 && !completed_at
  availableDay: number; // max day unlocked by time (days since started_at)
  isDayComplete: boolean; // has the user completed today's action?
  advance: () => Promise<void>; // mark today's action done, save to DB
  dismiss: () => Promise<void>; // set completed_at, skip remaining days
  dayConfig: OnboardingDayConfig; // today's text, CTA, target page
}
```

**7-day schedule — time-gated, action-completed:**

| Day | Focus     | Page               | Action to complete             | Banner text                                                               |
| --- | --------- | ------------------ | ------------------------------ | ------------------------------------------------------------------------- |
| 0   | Welcome   | any                | Dismiss modal                  | WelcomeModal (first login only)                                           |
| 1   | Vision    | /objectives        | Create a Vision                | "Day 1: What does your ideal future look like? Create your first vision." |
| 2   | Journal   | /journal           | Write entry + view AI analysis | "Day 2: Reflect on your vision. Write a journal entry."                   |
| 3   | Goal      | /objectives        | Convert Vision into a Goal     | "Day 3: Turn your vision into an achievable goal."                        |
| 4   | Breakdown | /objectives + /map | Create Objective + mind map it | "Day 4: Break your goal down. Try mapping it visually."                   |
| 5   | Action    | /objectives        | Create and complete first Task | "Day 5: Take your first action. Create a task and check it off."          |
| 6   | Review    | /tracking          | Visit Tracking dashboard       | "Day 6: See your first week of progress. Your review awaits."             |
| 7   | Streak    | any                | Login (auto-completes)         | "Day 7: You're back! That's a streak. Keep the momentum."                 |

**Unlocking logic:**

- `availableDay = Math.min(7, daysSince(onboarding_started_at) + 1)`
- User can only see/act on steps up to `availableDay`
- `onboarding_day` tracks highest _completed_ day
- If user completes today's action, `onboarding_day` advances and toast fires
- User cannot skip ahead (time-gated), but can catch up if they missed a day
- Day 7 auto-completes on login → sets `onboarding_completed_at` → celebration

**Push notification integration:** Each morning, if `onboarding_day < availableDay`, push: "Day N is ready: [banner text]". Critical for retention — the nudge brings them back.

Day 4 is intentionally combined (Objective + MindMap) to introduce both the hierarchy breakdown and visual mapping in one session, keeping the total at 7 days.

**New file:** `src/components/onboarding/OnboardingBanner.tsx` (~80 LOC)

- Non-blocking banner at top of page (not a modal)
- Shows: "Day N/7" progress, focus label (Vision/Journal/Goal/etc.), instruction text, CTA button linking to target page
- Locked state: if `day > availableDay`, shows "Unlocks tomorrow" with countdown
- Dismiss button ("I know what I'm doing")
- Subtle animation (slide-down on mount)
- Uses i18n for all text

**Modify files:**

- `src/pages/Journal.tsx` — render `<OnboardingBanner />` when `isActive`
- `src/pages/Objectives.tsx` — same
- `src/pages/Map.tsx` — same
- `src/pages/Ideate.tsx` — same
- `src/pages/Tracking.tsx` — same + auto-advance step 7 on mount
- `src/components/layout/AppLayout.tsx` — alternative: render banner here once (above `<Outlet />`) instead of per-page

**Decide:** Render banner in AppLayout (one place, always visible) vs per-page (can customize per step). Recommend AppLayout — simpler, one integration point.

**Modify WelcomeModal:** Keep for step 0 (first login only). Remove the language-change re-trigger (currently re-shows on language switch). When user clicks "Get Started," call `advance()` to move to step 1. After first login, modal only appears on-demand (e.g., help menu link "Show COMMIT Guide"). Change localStorage check: only `commit_welcome_modal_seen_${userId}`, drop the `_language_` key.

**i18n:** Add `onboarding.day1` through `onboarding.day7`, `onboarding.dismiss`, `onboarding.progress`, `onboarding.unlocksTomorrow`, `onboarding.complete` to all 3 language files.

**Tests:** `src/hooks/useOnboarding.test.ts` — test advance/dismiss, test auto-advance triggers, test completed_at gates.

### 2B. Empty-state guidance

**Files to modify** (inline changes, ~10-15 lines each):

| Page             | Empty condition      | Guidance text                                                                |
| ---------------- | -------------------- | ---------------------------------------------------------------------------- |
| `Journal.tsx`    | No entries           | "Start your first entry. Even 2 sentences count."                            |
| `Objectives.tsx` | No visions           | "What does your ideal life look like? Create your first vision."             |
| `Objectives.tsx` | Has vision, no goals | "Great vision! Now break it into 1-3 goals."                                 |
| `Map.tsx`        | No mind maps         | "Pick a challenge and let AI help you map it."                               |
| `Ideate.tsx`     | No ideas             | "What's been on your mind? Capture a rough idea."                            |
| `Tracking.tsx`   | No data              | "Complete a few tasks and journal entries — your dashboard will come alive." |

Pattern: `{items.length === 0 && <div className="text-center py-12 text-text-tertiary">...</div>}`

**i18n:** Add `emptyState.journal`, `emptyState.objectives`, etc. to all 3 files.

### 2C. Progressive disclosure

**Modify:** `src/pages/Objectives.tsx`

- Import `useOnboarding`
- If onboarding active (`day <= 7 && !completed_at`): show only Goals + Tasks columns (hide Vision, Objective)
- Add toggle: "Show all levels" that sets a preference and reveals full 4-column view
- After onboarding complete: always show full 4 columns

**Modify:** `src/hooks/useObjectivesSelection.ts`

- Add `visibleLevels` filter that respects onboarding state
- When reduced: selecting a Goal directly shows its Tasks (skip Objective level)

### 2D. Settings page

**New file:** `src/pages/Settings.tsx` (~200 LOC)

Dedicated `/settings` route. Consolidates scattered preferences and provides a home for v4.0 features.

**Sections:**

- **Appearance**: Theme toggle (light/dark), language selector — migrated from current header placement
- **Notifications**: Journal reminder, streak alert, task due, weekly digest toggles + reminder hour picker (Session 3 wires these)
- **Data**: "Export My Data" button (Session 5 wires this), timezone display
- **About**: "Show COMMIT Guide" link (opens WelcomeModal on-demand), app version

**Modify:** `src/config/navigation.ts` — add Settings route (gear icon in nav, not in bottom tab bar — accessible from header)
**Modify:** `src/App.tsx` — add lazy-loaded `/settings` route
**Modify:** Header component — add gear icon linking to `/settings`, remove inline theme/language toggles

**i18n:** Add `settings.appearance`, `settings.notifications`, `settings.data`, `settings.about`, `settings.exportData`, `settings.showGuide` to all 3 language files.

**Dependencies:** Requires Session 1 only for AI unavailable states to show cleanly during onboarding steps 1-2. Otherwise independent.

---

## Session 3: Push Notifications

**Goal:** Daily journal reminder, streak alerts, task due dates. Works on native (Capacitor) and web (Push API).

### 3A. Capacitor Push Notifications

**Install:** `npm install @capacitor/push-notifications @capacitor/local-notifications`

**New file:** `src/services/pushNotificationService.ts` (~150 LOC)

```typescript
export async function requestPermission(): Promise<boolean>;
export async function registerToken(userId: string): Promise<void>;
export async function scheduleLocalNotification(
  opts: LocalNotifyOpts,
): Promise<void>;
export async function handleDeepLink(notification: PushNotification): void;
export function isPermissionGranted(): Promise<boolean>;
```

- Native: Uses `@capacitor/push-notifications` for remote push + `@capacitor/local-notifications` for scheduled local
- Web: Uses Push API + Notification API
- Platform detection via existing `isNative` from `nativePlatformService.ts`

**Migration:** `supabase/migrations/20260401000003_push_tokens.sql`

```sql
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);
```

**Modify:** `src/contexts/AuthContext.tsx`

- After sign-in + preference sync: call `requestPermission()` → `registerToken(userId)`
- Only prompt if onboarding step >= 3 (don't overwhelm new users immediately)

### 3B. Web Push (PWA)

**New files:**

- `public/manifest.json` (~20 lines) — app name, icons, theme_color, start_url
- `public/sw.js` (~40 lines) — push event listener, notification click handler (deep link to relevant page), minimal offline shell (cache index.html + assets)

**Modify:** `index.html`

- Add `<link rel="manifest" href="/manifest.json">`
- Add service worker registration script

**Asset requirement:** Need 192x192 and 512x512 PNG icons. Can generate from existing logo or defer to manual asset creation.

### 3C. Notification preferences

**Migration:** `supabase/migrations/20260401000004_notification_prefs.sql`

```sql
ALTER TABLE user_preferences
  ADD COLUMN notify_journal_reminder boolean DEFAULT true,
  ADD COLUMN notify_streak_alert boolean DEFAULT true,
  ADD COLUMN notify_task_due boolean DEFAULT true,
  ADD COLUMN notify_weekly_digest boolean DEFAULT true,
  ADD COLUMN reminder_hour integer DEFAULT 20,
  ADD COLUMN timezone text;
```

**Modify:** `src/services/userPreferencesService.ts`

- Extend `UserPreferences` interface with new fields
- Extend `savePreferences()` and `loadPreferences()` to include them
- Auto-detect timezone on sign-in: `Intl.DateTimeFormat().resolvedOptions().timeZone`

**Modify:** `src/pages/Settings.tsx` (created in Session 2D) — wire the Notifications section with toggles bound to these new columns + reminder hour picker.

### 3D. Server-side push delivery

**New Edge Function:** `supabase/functions/push-notify/index.ts` (~120 LOC)

Triggered by pg_cron (every hour, checks which users need notifications based on their `reminder_hour` + `timezone`).

```typescript
// For each user where hour matches:
// 1. Journal reminder: if notify_journal_reminder && no entry today
// 2. Streak alert: if notify_streak_alert && streak > 3 && no entry today
// 3. Task due: if notify_task_due && tasks due today
// Send via platform-appropriate push service (FCM for Android, APNs for iOS, Web Push for web)
```

**Note:** FCM setup (Firebase project, server key) is a prerequisite for native push. Web Push needs VAPID keys. These are infrastructure tasks that happen before coding.

**Dependencies:** Session 3 depends on Sessions 1-2 being done (onboarding step check for permission prompt timing).

---

## Session 4: Weekly Digest & Insights

**Goal:** Transform Tracking from raw numbers to interpretive insights. Weekly digest delivered via push. Streak celebrations.

### 4A. Weekly digest

**Migration:** `supabase/migrations/20260401000005_weekly_digests.sql`

```sql
CREATE TABLE weekly_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  stats jsonb NOT NULL,
  insights text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);
ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own digests" ON weekly_digests
  FOR SELECT USING (auth.uid() = user_id);
```

**New Edge Function:** `supabase/functions/weekly-digest/index.ts` (~150 LOC)

- Triggered by pg_cron every Sunday at 18:00 UTC
- For each user with `notify_weekly_digest = true`:
  1. Query week's data: tasks completed, journal entries, objectives progressed, streak
  2. Compare to previous week (delta %)
  3. Call LLM (via ai-proxy) with stats to generate 2-3 interpretive insights
  4. Insert into `weekly_digests`
  5. Send push notification with summary

### 4B. Tracking page insights

**New file:** `src/components/tracking/InsightsCard.tsx` (~120 LOC)

- Reads latest `weekly_digest` from Supabase
- Also computes live data: current streak, tasks due today, week-over-week delta
- Renders at top of Tracking page:
  - "12 tasks completed (+3 from last week)"
  - "7-day journal streak — your longest yet"
  - AI-generated insight from digest
  - "Goal 'Learn Spanish' is 80% complete"

**Modify:** `src/pages/Tracking.tsx` — render `<InsightsCard />` above widget grid

**Modify:** `src/hooks/useCreativeData.ts` — add `weekOverWeekDelta()` helper that compares current period stats to previous period

### 4C. Streak celebrations

**New file:** `src/components/ui/Celebration.tsx` (~60 LOC)

- CSS-only confetti animation (no dependencies)
- Props: `milestone: number`, `onDismiss: () => void`
- Renders: full-screen overlay with congratulations message + confetti
- Auto-dismisses after 4 seconds or on click

**New file:** `src/hooks/useStreakCelebration.ts` (~40 LOC)

- On mount: check current streak against milestones [3, 7, 14, 30, 60, 100]
- Track which milestones have been celebrated in `localStorage: streak_milestones_celebrated_${userId}`
- If new milestone reached: trigger Celebration component
- Integrated in `AppLayout.tsx`

**Dependencies:** Session 4 depends on Session 3 (push delivery for weekly digest notification). InsightsCard can be built independently.

---

## Session 5: Quick Wins

**Goal:** Persist idea connections to DB. Full data export.

### 5A. Persist idea connections

**Migration:** `supabase/migrations/20260401000006_idea_connections_upsert.sql`

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_idea_connections_pair
  ON idea_connections (idea_id, connected_idea_id);
```

**New file:** `src/services/ideaConnectionService.ts` (~60 LOC)

```typescript
export async function saveConnections(
  ideaId: string,
  connections: IdeaConnection[],
): Promise<void>;
export async function loadConnections(
  ideaId: string,
): Promise<IdeaConnection[]>;
export async function deleteConnection(connectionId: string): Promise<void>;
```

- `saveConnections` uses upsert (ON CONFLICT DO UPDATE) on the unique index
- Sets `is_ai_generated = true` for AI-discovered connections

**Modify:** `src/pages/IdeaDetail.tsx`

- On mount: call `loadConnections(ideaId)` → display saved connections immediately
- After AI returns new connections: call `saveConnections(ideaId, newConnections)` → merge with existing
- Remove ephemeral-only state management for connections

**Modify:** `src/hooks/useIdeaEditor.ts`

- `loadConnections()` call on init
- Connection state persisted across page reloads

### 5B. Full data export

**New file:** `src/services/exportService.ts` (~100 LOC)

```typescript
export async function exportAllData(
  userId: string,
  format: "json" | "markdown",
): Promise<Blob>;
```

Queries all user data:

- Journal entries + AI analyses
- Visions > Goals > Objectives > Tasks (hierarchy preserved)
- Ideas + connections
- Mind maps
- Weekly digests
- Tracking stats (from useCreativeData pattern)

JSON format: structured object with sections. Markdown format: readable document with headers and lists.

Download via Blob → ObjectURL → temp anchor (same pattern as existing idea export in IdeaDetail.tsx lines 263-299).

**UI:** Add "Export My Data" button in Settings area. Single click → browser download.

**Dependencies:** Session 5 is independent — can slot in anywhere.

---

## Execution Order

```
Session 1 (Honest AI) ──────┐
                             ├── Session 3 (Push) ── Session 4 (Insights)
Session 2 (Onboarding) ─────┘

Session 5 (Quick Wins) ── independent, parallel with any session
```

Sessions 1 + 2: parallel (no dependencies between them)
Session 3: after 1 + 2 (push content references AI states + onboarding step)
Session 4: after 3 (weekly digest delivered via push)
Session 5: anytime

## Verification Plan

After each session:

1. `npm run typecheck` — 0 errors
2. `npm run lint` — 0 errors (warnings OK)
3. `npm run test` — all existing + new tests pass
4. `npm run build` — production build succeeds
5. Manual smoke test of affected features

After all sessions:

- Full E2E: sign up → onboarding flow → journal → AI analysis → create goal → task → complete → tracking → export
- Push notification test on Android emulator + web
- Verify AI unavailable states render correctly when Edge Function is down
