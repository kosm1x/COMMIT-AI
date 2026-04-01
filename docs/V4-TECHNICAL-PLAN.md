# v4.0 Technical Plan — Retention

> Theme: Make the habit stick.
> Scope: Guided onboarding, honest AI, push notifications, weekly digest.
> Prerequisite reading: `docs/NORTH-STAR.md`

## Guiding Constraints

- No new database tables unless absolutely necessary. Prefer columns on existing tables.
- Migrations are additive only. No DROP, no ALTER existing columns.
- Every feature must work without Jarvis running (Groq fallback or graceful degradation).
- Mobile changes go through Capacitor — no native code unless unavoidable.
- All user-facing strings go through i18n (`t()` keys in en/es/zh).

---

## Session 1: Honest AI (foundation for everything else)

**Goal:** Eliminate silent mock fallbacks. When AI fails, users know. When AI works, it actually uses their context.

### 1A. Replace mock fallbacks with explicit failure states

**Current behavior:** Every AI function has a `generateMock*()` fallback that returns hardcoded data. Users see fake emotions, fake suggestions, fake mind maps — indistinguishable from real ones.

**New behavior:** When the LLM call fails or returns unparseable JSON, return a typed `{ status: 'unavailable' }` result instead of mock data. The UI shows a clear "AI analysis unavailable — try again later" state.

**Files to change:**

- `src/services/ai/*.ts` (all 8 modules) — replace `generateMock*()` calls with `null` returns
- `src/lib/aiSchemas.ts` — no changes needed (`.catch()` defaults stay as parse fallbacks, but mock _generators_ are removed)
- Every component that consumes AI results — add "unavailable" empty state

**Migration strategy:** Keep `generateMock*()` functions but gate them behind `import.meta.env.DEV`. Dev mode still gets mock data for testing. Production gets honest failures.

**Tests:** Update `aiService.test.ts` — mock fallback tests now assert `null` return in production mode, mock data in dev mode.

### 1B. Add user context to AI prompts

**Current behavior:** AI functions receive only the immediate input (journal text, idea title, goal name). No user history, no existing goals, no patterns.

**New behavior:** Create a `buildUserContext()` helper that assembles a context block for AI prompts:

```typescript
// src/services/ai/userContext.ts
interface UserAIContext {
  recentEmotions: { name: string; date: string }[]; // last 7 journal analyses
  activeGoals: { title: string; progress: number }[]; // top 5 by activity
  completionRate: number; // last 30 days
  streakDays: number;
  preferredLanguage: string;
}

export async function buildUserContext(userId: string): Promise<UserAIContext>;
```

Inject this context into the system prompt of every AI call. Each AI function's prompt gets a `## User Context` section prepended.

**Files to change:**

- New: `src/services/ai/userContext.ts` (~80 LOC)
- `src/services/ai/callLLM.ts` — accept optional `context: UserAIContext` parameter
- `src/services/ai/journal.ts`, `ideas.ts`, `objectives.ts`, `strategic.ts`, `analysis.ts` — pass context from caller
- Callers in hooks/components — pass `user.id` to the service layer

**Data access:** `buildUserContext()` queries `ai_analysis` (last 7), `goals` (active, with task completion counts), `tasks` (30-day completion rate), `journal_entries` (streak calculation). All behind RLS — user can only see their own data.

**Performance:** Cache the context for 5 minutes in module scope (keyed by user ID). Invalidate on write operations (journal save, task completion). The context query is ~4 small SELECTs — well under 100ms.

### 1C. Track AI suggestion feedback

**Current behavior:** `agent_suggestions` table tracks Jarvis suggestions (accept/reject). But the 12 client-side AI functions (next steps, divergent paths, etc.) have no feedback tracking at all.

**New behavior:** Add a `user_preferences.ai_feedback` JSONB column to store lightweight signal:

```sql
-- Migration: additive
ALTER TABLE user_preferences ADD COLUMN ai_feedback jsonb DEFAULT '{}';
```

Schema:

```json
{
  "accepted_types": {
    "next_steps": 12,
    "divergent_paths": 3,
    "critical_analysis": 7
  },
  "rejected_types": { "next_steps": 2, "divergent_paths": 5 },
  "last_updated": "2026-04-01T00:00:00Z"
}
```

When user clicks "Save as Idea" or "Create Task" from an AI panel, increment the accepted count. Add a subtle "Not helpful" dismiss button to each AI panel section — increment rejected count.

**Files to change:**

- New migration: `supabase/migrations/20260401000001_ai_feedback_column.sql`
- `src/services/userPreferencesService.ts` — `updateAIFeedback(type, accepted)` function
- `src/components/AIAssistantPanel.tsx` — wire accept/reject handlers
- `src/services/ai/userContext.ts` — include `ai_feedback` in context sent to LLM

**Future use:** v4.1 will use these ratios to adjust AI prompt style ("user prefers actionable next steps over abstract analysis").

---

## Session 2: Guided Onboarding

**Goal:** A 7-day progressive onboarding that teaches the COMMIT framework by having users do it. Replace "here's the philosophy, good luck" with "do this now."

### 2A. Onboarding state machine

**New table column:**

```sql
ALTER TABLE user_preferences ADD COLUMN onboarding_step integer DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN onboarding_completed_at timestamptz;
```

Steps:

| Step | Trigger to advance                   | What user does                   |
| ---- | ------------------------------------ | -------------------------------- |
| 0    | Account created                      | See welcome screen               |
| 1    | First journal entry saved            | Write first journal entry        |
| 2    | Journal AI analysis viewed           | See their first emotion analysis |
| 3    | First Vision created                 | Create a vision                  |
| 4    | First Goal created under that Vision | Break vision into a goal         |
| 5    | First Task created under that Goal   | Create an actionable task        |
| 6    | First Task completed                 | Check off the task               |
| 7    | Tracking page visited                | See their first progress data    |
| null | `onboarding_completed_at` set        | Done — never show again          |

**Implementation:**

- New: `src/hooks/useOnboarding.ts` (~120 LOC) — reads `onboarding_step` from preferences, exposes `step`, `advance()`, `dismiss()`, `isActive`
- New: `src/components/onboarding/OnboardingBanner.tsx` (~80 LOC) — persistent banner at top of each page showing current step + CTA. Not a modal — doesn't block usage.
- Advancement is event-driven: `useOnboarding` listens to the relevant data hooks (journal save, task create, etc.) and auto-advances when criteria are met.
- User can dismiss onboarding at any time ("I know what I'm doing" → sets `onboarding_completed_at`).

**Files to change:**

- New migration: `supabase/migrations/20260401000002_onboarding_columns.sql`
- New: `src/hooks/useOnboarding.ts`
- New: `src/components/onboarding/OnboardingBanner.tsx`
- `src/pages/Journal.tsx`, `Objectives.tsx`, `Map.tsx`, `Ideate.tsx`, `Tracking.tsx` — render `<OnboardingBanner />` when `isActive`
- `src/i18n/en.ts`, `es.ts`, `zh.ts` — onboarding step strings
- Remove or simplify existing `WelcomeModal` — it's replaced by the progressive banner

### 2B. Empty-state guidance

**Current behavior:** Blank pages show nothing. User stares at empty Kanban columns.

**New behavior:** Every page gets a contextual empty state:

- Journal (no entries): "Start your first entry. Even 2 sentences count."
- Objectives (no visions): "What does your ideal life look like? Create your first vision."
- Objectives (has vision, no goals): "Great vision! Now break it into 1-3 goals."
- Map (no mind maps): "Pick a problem and let AI help you visualize it."
- Ideate (no ideas): "What's been on your mind? Capture a rough idea."
- Tracking (no data): "Complete a few tasks and journal entries — your dashboard will come alive."

**Implementation:** Conditional rendering in each page component. No new components needed — just inline `{items.length === 0 && <EmptyState />}` blocks with i18n strings.

### 2C. Hierarchy simplification (progressive disclosure)

**Current behavior:** All 4 levels (Vision > Goal > Objective > Task) visible immediately in the Kanban.

**New behavior:** Users in onboarding (steps 0-6) see only 2 columns: **Goals** and **Tasks**. After onboarding completes, the full 4-column Kanban unlocks. A "Show all levels" toggle is always available for users who want it early.

**Files to change:**

- `src/pages/Objectives.tsx` — check `onboardingStep` to determine visible columns
- `src/hooks/useObjectivesSelection.ts` — respect column visibility

---

## Session 3: Push Notifications

**Goal:** Daily journal reminder, streak alerts, task due date notifications. The #1 retention lever.

### 3A. Capacitor Push Notifications plugin

**Setup:**

```bash
npm install @capacitor/push-notifications
npx cap sync
```

**Implementation:**

- New: `src/services/pushNotificationService.ts` (~150 LOC)
  - `requestPermission()` — prompt user, store token
  - `registerToken(userId, token, platform)` — save to DB
  - `scheduleLocal(title, body, triggerAt)` — local notification for reminders
  - `handleReceived(notification)` — deep link to relevant page
- New migration: `supabase/migrations/20260401000003_push_tokens.sql`

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

### 3B. Web Push (PWA fallback)

For web users, use the Push API + service worker:

- New: `public/sw.js` — minimal service worker for push + offline shell
- New: `public/manifest.json` — PWA manifest (icons, name, theme color)
- `index.html` — register service worker, add manifest link
- `src/services/pushNotificationService.ts` — detect platform, use Capacitor on native, Push API on web

### 3C. Notification preferences

**New columns on `user_preferences`:**

```sql
ALTER TABLE user_preferences ADD COLUMN notify_journal_reminder boolean DEFAULT true;
ALTER TABLE user_preferences ADD COLUMN notify_streak_alert boolean DEFAULT true;
ALTER TABLE user_preferences ADD COLUMN notify_task_due boolean DEFAULT true;
ALTER TABLE user_preferences ADD COLUMN notify_weekly_digest boolean DEFAULT true;
ALTER TABLE user_preferences ADD COLUMN reminder_hour integer DEFAULT 20; -- 8 PM local
```

**UI:** Add a "Notifications" section to Settings page (currently only has Language + Theme).

### 3D. Server-side push delivery

**New Edge Function:** `supabase/functions/push-notify/index.ts`

Triggered by pg_cron (daily at each user's `reminder_hour` in their timezone) or by Jarvis event reactor.

Notification types:

- **Journal reminder** (daily): "How was your day? Take a moment to reflect." — deep links to `/journal`
- **Streak alert** (when streak > 3 and no entry today by 8 PM): "Don't break your 7-day journal streak!"
- **Task due** (morning of due date): "3 tasks due today" — deep links to `/objectives`
- **Weekly digest** (Sundays): "This week: 8 tasks completed, 2 journal entries. Here's your progress." — deep links to `/tracking`

---

## Session 4: Weekly Digest & Compounding Insights

**Goal:** Transform the Tracking page from "raw numbers" to "here's proof you're growing."

### 4A. Weekly digest generation

**New Edge Function:** `supabase/functions/weekly-digest/index.ts`

Runs every Sunday via pg_cron. For each user with `notify_weekly_digest = true`:

1. Query last 7 days: tasks completed, journal entries, objectives progressed, streaks
2. Compare to previous 7 days (delta percentages)
3. Call LLM with user context (from 1B) to generate 2-3 interpretive insights
4. Store in new `weekly_digests` table
5. Send push notification with summary

```sql
CREATE TABLE weekly_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  stats jsonb NOT NULL,           -- { tasks_completed, entries_written, streak, etc. }
  insights text[] NOT NULL,       -- AI-generated interpretive insights
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);
ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own digests" ON weekly_digests
  FOR SELECT USING (auth.uid() = user_id);
```

### 4B. Tracking page interpretive layer

**Current behavior:** Dashboard widgets show counts: "12 tasks completed", "3 journal entries".

**New behavior:** Add an "Insights" card at the top of the Tracking page that shows:

- Week-over-week delta: "Tasks completed: 12 (+3 from last week)"
- Pattern detection: "You're most productive on Thursdays"
- Streak context: "7-day journal streak — your longest yet"
- Goal proximity: "Goal 'Learn Spanish' is 80% complete (3 tasks remaining)"

**Implementation:**

- New: `src/components/tracking/InsightsCard.tsx` (~120 LOC) — reads from `weekly_digests` + live data
- `src/hooks/useCreativeData.ts` — add `weekOverWeekDelta()` calculation
- `src/pages/Tracking.tsx` — render `<InsightsCard />` above the widget grid

### 4C. Streak celebrations

**Current behavior:** Streak is a number in StatsOverview widget. No emotional response.

**New behavior:** Milestone streaks trigger a celebration:

- 3-day: Subtle badge animation
- 7-day: Confetti + "1 week strong!" toast
- 30-day: Full-screen celebration + shareable card
- 100-day: ??? (easter egg territory)

**Implementation:**

- New: `src/components/ui/Celebration.tsx` (~60 LOC) — CSS confetti animation + toast
- `src/hooks/useStreakCelebration.ts` (~40 LOC) — check streak milestones on login, fire once per milestone
- `src/contexts/AuthContext.tsx` — call `useStreakCelebration` after session load

---

## Session 5: Persist Idea Connections + Data Export

**Goal:** Two quick wins from the audit — make idea connections real and give users their data.

### 5A. Persist idea connections to database

**Current behavior:** `findIdeaConnections()` returns connections that exist only in component state. Refresh the page and they're gone.

**New behavior:** When AI returns connections, auto-save them to the existing `idea_connections` table. On page load, fetch saved connections first, then optionally refresh via AI.

**Files to change:**

- `src/pages/IdeaDetail.tsx` — on AI connection result, call `saveConnections()`
- `src/services/ideaConnectionService.ts` (new, ~60 LOC) — CRUD for `idea_connections` table
- `src/hooks/useIdeaEditor.ts` — load saved connections on mount

### 5B. Data export

**New:** `src/services/exportService.ts` (~100 LOC)

```typescript
export async function exportAllData(
  userId: string,
  format: "json" | "markdown",
): Promise<Blob>;
```

Queries all user data (journal, objectives hierarchy, ideas, mind maps, tracking stats) and bundles into a downloadable file. JSON for portability, Markdown for readability.

**UI:** Add "Export My Data" button to Settings page. Single click → browser download.

---

## Execution Order & Dependencies

```
Session 1 (Honest AI)          Session 2 (Onboarding)
  1A: Kill mock fallbacks         2A: State machine + banner
  1B: User context builder        2B: Empty states
  1C: Feedback tracking           2C: Progressive disclosure
         |                              |
         +----------+------------------+
                    |
              Session 3 (Push)
                3A: Capacitor plugin
                3B: Web Push / PWA
                3C: Notification prefs
                3D: Server-side delivery
                    |
              Session 4 (Insights)
                4A: Weekly digest
                4B: Interpretive tracking
                4C: Streak celebrations
                    |
              Session 5 (Quick wins)
                5A: Persist connections
                5B: Data export
```

Sessions 1 and 2 can run in parallel (no dependencies). Session 3 depends on both (push content references onboarding steps + AI context). Session 4 depends on 3 (weekly digest is delivered via push). Session 5 is independent — can slot in anywhere.

## New Files Summary

| File                                             | LOC (est.) | Purpose                           |
| ------------------------------------------------ | ---------- | --------------------------------- |
| `src/services/ai/userContext.ts`                 | 80         | Build user context for AI prompts |
| `src/hooks/useOnboarding.ts`                     | 120        | Onboarding state machine          |
| `src/components/onboarding/OnboardingBanner.tsx` | 80         | Progressive onboarding UI         |
| `src/services/pushNotificationService.ts`        | 150        | Push notification abstraction     |
| `src/services/exportService.ts`                  | 100        | Full data export                  |
| `src/services/ideaConnectionService.ts`          | 60         | Persist idea connections          |
| `src/components/tracking/InsightsCard.tsx`       | 120        | Interpretive insights card        |
| `src/components/ui/Celebration.tsx`              | 60         | Streak celebration animation      |
| `src/hooks/useStreakCelebration.ts`              | 40         | Milestone detection               |
| `supabase/functions/push-notify/index.ts`        | 120        | Server-side push delivery         |
| `supabase/functions/weekly-digest/index.ts`      | 150        | Weekly digest generation          |
| `public/sw.js`                                   | 40         | Service worker for web push       |
| `public/manifest.json`                           | 20         | PWA manifest                      |
| 4 SQL migrations                                 | ~60        | Schema additions                  |

**Total new code:** ~1,200 LOC across 14 files + 4 migrations.

## New Database Objects

| Object                                     | Type           | Purpose                            |
| ------------------------------------------ | -------------- | ---------------------------------- |
| `user_preferences.onboarding_step`         | Column         | Onboarding progress                |
| `user_preferences.onboarding_completed_at` | Column         | Onboarding completion              |
| `user_preferences.ai_feedback`             | Column (JSONB) | AI suggestion accept/reject signal |
| `user_preferences.notify_*`                | Columns (4)    | Notification preferences           |
| `user_preferences.reminder_hour`           | Column         | Preferred reminder time            |
| `push_tokens`                              | Table          | Device push tokens                 |
| `weekly_digests`                           | Table          | Cached weekly digest data          |

## Exit Criteria

- [ ] AI failures show "unavailable" state — never mock data in production
- [ ] AI prompts include user's recent emotions, active goals, and completion rate
- [ ] AI suggestion accept/reject is tracked in `ai_feedback`
- [ ] New users see progressive onboarding banner (7 steps)
- [ ] Empty pages show contextual guidance
- [ ] Push notifications work on iOS, Android, and web
- [ ] Users can configure notification preferences in Settings
- [ ] Weekly digest generates and delivers every Sunday
- [ ] Tracking page shows interpretive insights (not just raw counts)
- [ ] Streak milestones trigger celebrations (3, 7, 30 days)
- [ ] Idea connections persist to database
- [ ] Users can export all their data as JSON or Markdown
- [ ] All new strings in en/es/zh
- [ ] 0 type errors, 0 lint errors, all existing tests pass
- [ ] New tests for: `userContext.ts`, `useOnboarding`, `pushNotificationService`, `exportService`
