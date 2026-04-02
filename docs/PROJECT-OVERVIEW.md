# COMMIT-AI: Project Overview

> The app that turns self-reflection into self-improvement — and makes the habit stick.

## What COMMIT-AI Is

COMMIT-AI is a personal growth companion built around a single idea: **the loop is the product.**

Most productivity tools solve one piece of the puzzle. Todoist tracks tasks but never asks why they matter. Day One captures feelings but doesn't connect them to action. Goal trackers show progress bars but never say "you tend to quit at week 3 — let's plan for that."

COMMIT-AI closes the loop. It connects what you _feel_ (journal) to what you _want_ (objectives) to what you _do_ (tasks) to what you _learn_ (tracking) — and uses AI to surface the patterns you can't see yourself.

The framework is called COMMIT:

- **C**ontext — Journaling. Understand where you are before deciding where to go.
- **O**bjectives — A 4-level hierarchy (Vision > Goal > Objective > Task) that breaks dreams into daily actions.
- **M**indMap — AI-powered visual breakdowns that turn abstract goals into structured plans.
- **I**deate — A creative space for capturing rough thoughts and discovering connections between them.
- **T**rack — A dashboard that doesn't just show numbers — it tells you what the numbers mean.

The AI doesn't chat. It's embedded in the workflow: analyzing journal emotions, suggesting goal breakdowns, finding connections between ideas, interpreting your progress. It speaks when it has something useful to say and stays quiet when it doesn't.

---

## Design Philosophy

Five beliefs shape every decision:

**1. The loop is the product.** Every feature must strengthen the reflect > plan > act > measure > reflect cycle. If a feature doesn't connect at least two phases, it probably shouldn't exist.

**2. AI should know you, not just answer you.** Stateless LLM calls are a commodity. COMMIT's AI advantage comes from context accumulation: your goals, your patterns, your history, your preferences. Every AI interaction should feel like talking to someone who's been paying attention — not a stranger reading your prompt for the first time.

**3. Retention is the feature.** A beautiful dashboard nobody opens after week 2 is worthless. Every feature needs a retention mechanism: a reason to come back tomorrow. Streaks, nudges, insights that compound. The app should feel worse to abandon than to use.

**4. Guided > flexible.** Power users will explore. New users need guardrails. The first week is opinionated: "Do this, then this, then this." We earn the right to show complexity after we've delivered value.

**5. Honest > impressive.** A fake AI insight is worse than no insight. If the model fails, say so. If the analysis is shallow, admit it. Users will forgive "AI unavailable" — they won't forgive discovering their emotional analysis was boilerplate.

---

## Architecture

### Stack

| Layer      | Technology                                      | Notes                                              |
| ---------- | ----------------------------------------------- | -------------------------------------------------- |
| Frontend   | React 18 + TypeScript 5.5 + Vite 5 + Tailwind 3 | SPA, lazy-loaded pages, dark mode                  |
| Database   | Supabase (PostgreSQL)                           | 22 migrations, 15+ tables, RLS on everything       |
| Auth       | Supabase Auth                                   | Email/password + biometric via Capacitor           |
| AI         | Vendor-agnostic via Edge Function               | Groq (Qwen 3.2) default, configurable via env vars |
| Validation | Zod                                             | 11 schemas for all AI response types               |
| Mobile     | Capacitor 8                                     | iOS + Android shells                               |
| Diagrams   | Mermaid 11                                      | AI-generated mind maps                             |
| Testing    | Vitest + Playwright                             | 217 unit tests, 8 E2E tests                        |

### Data Model

The objectives hierarchy is the structural backbone:

```
Vision ("Become fluent in Spanish")
  └── Goal ("Complete B2 certification")
        └── Objective ("Finish grammar module")
              └── Task ("Practice subjunctive for 30 min")
```

Each level has nullable FK to parent (orphaned items supported — you can create a Task without a Vision). Status: `not_started | in_progress | completed | on_hold`. Priority: `high | medium | low`. Completed non-recurring tasks auto-prune after 15 days.

All tables enforce `user_id` FK with CASCADE DELETE and RLS policies. The hierarchy tables plus `journal_entries` track provenance (`modified_by: user | jarvis | system`).

### AI Service

12 functions routed through a single `callLLM()` adapter:

- **Journal**: `analyzeJournalEntry` (emotion detection), `extractObjectivesFromJournal` (auto-extract goals from reflections)
- **Mind Map**: `generateMindMap` (visual goal breakdown)
- **Ideas**: `completeIdea`, `findIdeaConnections`, `transformIdeaText`
- **Strategic**: `generateDivergentPaths`, `suggestNextSteps`
- **Analysis**: `generateCriticalAnalysis`, `generateRelatedConcepts`
- **Objectives**: `suggestObjectivesForGoal`, `suggestTasksForObjective`

All calls go through a Supabase Edge Function (`ai-proxy`) that keeps the API key server-side. The function reads `LLM_MODEL`, `LLM_ENDPOINT`, `LLM_API_KEY` env vars — swap providers without code changes. Groq is the fallback.

Every AI function returns `AIResult<T>` — a discriminated union of `{ status: 'ok', data: T }` or `{ status: 'unavailable' }`. No silent mock data in production. In dev mode, mock generators still run for offline development.

### Jarvis Integration

COMMIT is the strategic UI. Jarvis is the intelligence engine.

Jarvis (a separate agent system in `mission-control/`) connects to COMMIT through:

- **Data layer**: Shared Supabase tables with `modified_by` provenance
- **Event bridge**: `commit-events` Edge Function fires on DB changes, Jarvis reacts
- **Suggestions**: `agent_suggestions` table where Jarvis proposes actions, users accept/reject via `SuggestionsPanel`
- **AI routing**: Jarvis-first for complex analysis, Groq fallback for simple calls

The integration was completed across two phases (v2.26 data unification + v3.0 production hardening) with structured logging (Pino), 3-layer tool guardrails, and provider rotation.

---

## UI Design

### Pages (7 routes)

| Route         | Purpose                                            | Key Components                                                                  |
| ------------- | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `/journal`    | Daily reflection + AI emotion analysis             | Entry list, editor, AI analysis card, pagination                                |
| `/objectives` | 4-column Kanban (Vision > Goal > Objective > Task) | Column components, inline editing, drag ordering, selection family highlighting |
| `/map`        | AI-generated mind maps + Kanban view toggle        | Mermaid rendering, split view                                                   |
| `/ideate`     | Idea capture + AI connections                      | Idea grid, detail page, connection sidebar                                      |
| `/track`      | Progress dashboard                                 | Stats overview, streak counter, completion charts                               |
| `/settings`   | Preferences + account                              | Theme, language, notifications, data export, guide link                         |
| `/login`      | Auth                                               | Sign in/up, password reset, strength indicator                                  |

### Design Patterns

- **Mobile-first responsive**: Bottom tab bar, BottomSheet for mobile lists, 4-column desktop Kanban
- **Progressive disclosure**: New users see Goals + Tasks only; Vision + Objective columns unlock after onboarding
- **Empty states**: Every blank page has contextual guidance ("Start your first entry. Even 2 sentences count.")
- **Dark mode**: Full Tailwind `dark:` variant coverage, HTML class toggle
- **i18n**: English, Spanish, Chinese. All strings via `useLanguage().t('key')`
- **Accessibility**: 46+ ARIA labels, focus traps on modals, nav landmarks, keyboard navigation
- **Error states**: Toast notifications for all async failures, `AIUnavailable` component for AI outages

### Onboarding (7-day, time-gated)

New users get one lesson per day, each mapped to a COMMIT pillar:

| Day | Focus   | Action                         |
| --- | ------- | ------------------------------ |
| 0   | Welcome | Dismiss welcome modal          |
| 1   | Vision  | Create first vision            |
| 2   | Journal | Write entry, see AI analysis   |
| 3   | Goal    | Turn vision into a goal        |
| 4   | MindMap | Break goal down visually       |
| 5   | Task    | Create and complete first task |
| 6   | Review  | Visit tracking dashboard       |
| 7   | Streak  | Return (auto-completes)        |

The banner is collapsible (pill on mobile, full bar on desktop), non-blocking, and dismissible. Users can unlock all hierarchy levels early via "Show all levels" toggle.

---

## Evolution

### Timeline

| Date          | Milestone                              | Scale                                                                                                                                          |
| ------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03 early | First commit                           | Functional prototype — journal, objectives, AI via client-side Groq key                                                                        |
| 2026-03-13    | Phase 1: Security & Foundation         | API key moved server-side, Vitest established, 81 tests                                                                                        |
| 2026-03-15    | Phase 2: Architecture Refactor         | Monolith split (1332 LOC hook → 4), Zod validation, auto-generated DB types, error toasts                                                      |
| 2026-03-17    | Phases 3-5: Performance, Testing, Docs | Memoization, pagination, accessibility, 215 tests, doc cleanup                                                                                 |
| 2026-03-28    | Phase 6 + Jarvis Integration           | DB indexes, E2E tests, undo/redo, Jarvis unification (v2.26 + v3.0)                                                                            |
| 2026-04-01    | v4.0 Sessions 1-2                      | Honest AI (discriminated unions, contextual engine, feedback tracking), guided onboarding, Settings page, empty states, progressive disclosure |
| 2026-04-02    | v4.0 Session 3                         | Push notifications: Capacitor local + PWA service worker + Edge Function delivery + notification preferences UI                                |

### By the Numbers

| Metric                 | v1.0 (Mar 13) | Today (Apr 2)             |
| ---------------------- | ------------- | ------------------------- |
| Commits                | ~90           | 157                       |
| Test assertions        | 0             | 217                       |
| Test files             | 0             | 14                        |
| E2E tests              | 0             | 8                         |
| DB tables              | 8             | 16                        |
| SQL migrations         | ~10           | 24                        |
| ARIA labels            | 4             | 46+                       |
| Client-side secrets    | 1             | 0                         |
| Lint errors            | 35            | 0                         |
| `any` types            | 71            | 0                         |
| AI response validation | None          | 11 Zod schemas            |
| i18n languages         | 3             | 3 (with full v4 coverage) |
| Source LOC             | ~20K          | ~30K                      |

### What Changed and Why

**Phase 1-2 (Foundation)**: The original codebase worked but had structural debt — an exposed API key, no tests, a 1332-line state hook, manual database types, no error UI. These phases were about earning the right to build features by making the foundation trustworthy.

**Phase 3-5 (Polish)**: Memoization, pagination, accessibility, and documentation cleanup. The kind of work that doesn't create new features but makes existing ones actually usable by real people.

**Jarvis Integration**: Connected COMMIT to an external intelligence engine. COMMIT became the user-facing strategy tool; Jarvis became the background intelligence that proposes actions, detects patterns, and manages complex workflows. The integration required provenance tracking, event bridges, and careful separation of concerns.

**v4.0 (Retention)**: The product audit revealed the real problem: users could _use_ the app, but nothing made them _come back_. AI returned fake data on failure (dishonest). There was no onboarding (overwhelming). No push notifications (forgettable). Tracking showed raw numbers without interpretation (uninspiring). v4.0 is structured around fixing all four.

---

## Current State (v4.0, April 2026)

### What's Shipped

**Sessions 1-3 are complete.** The AI is honest and contextual. New users get a guided 7-day onboarding. Every page has empty-state guidance. The objectives hierarchy simplifies itself for beginners. There's a proper Settings page. Push notifications are wired — local scheduling on native, PWA + service worker on web, server-side Edge Function for delivery.

### What's Next

Two sessions remain before v4.0 is feature-complete:

**Session 4: Weekly Digest & Insights** — Transform Tracking from "here are numbers" to "here's proof you're growing." AI-generated weekly digest with interpretive insights. Week-over-week deltas. Streak celebrations at milestones (3, 7, 30 days).

**Session 5: Quick Wins** — Persist idea connections to database (currently ephemeral). Full data export (JSON + Markdown). Small scope, high value.

### What Needs Testing

This is an MVP preparing for real users. Before the next push of improvement, the following need hands-on validation:

1. **Onboarding flow end-to-end** — Does the 7-day progression feel natural? Is the time-gating (one day per step) motivating or frustrating? Does the banner feel helpful or nagging?

2. **AI quality** — The contextual engine now passes user history to every AI call. Do the responses actually feel more personal? Is the emotion analysis meaningful or shallow?

3. **Progressive disclosure** — New users see Goals + Tasks only. Does this reduce confusion? Do users naturally discover the Vision/Objective levels, or do they never expand?

4. **Empty states** — Do the guidance messages actually lead to action, or do users ignore them?

5. **Settings page** — Is it discoverable enough? Should theme/language also remain in the header, or is Settings-only sufficient?

6. **Mobile experience** — The layout is responsive, but hasn't been tested on physical devices with the new onboarding banner, Settings page, and notification scheduling.

7. **Push notifications** — Local notifications schedule correctly on native? Web notifications fire when tab is open? Settings toggles + hour picker persist and reschedule? Streak alert cancels on journal save?

### Known Gaps

- VAPID keys not generated yet (needed for web push background delivery)
- FCM/APNs not configured (needed for native remote push; local notifications cover the gap)
- Tracking page shows raw data, no interpretive layer (Session 4)
- Idea connections are ephemeral — lost on page refresh (Session 5)
- No data export (Session 5)
- No offline support beyond PWA shell
- Service role key hardcoded in one migration (documented, repo is private)

---

## Beyond v4.0

The versioning strategy from the North Star:

| Version  | Theme           | Core Deliverable                                                  |
| -------- | --------------- | ----------------------------------------------------------------- |
| **v4.0** | Retention       | Guided onboarding, push notifications, honest AI, weekly digest   |
| **v4.1** | Intelligence    | Compounding insights, feedback-adapted prompts, pattern detection |
| **v4.2** | Mobile          | Offline support, native widgets, haptics, platform conventions    |
| **v5.0** | Network Effects | Accountability partners, shareable milestones, data portability   |

### Open Questions

- **Self-hosting**: How hard is it to run COMMIT without Supabase? Auth is the tightest coupling. A migration guide exists (`docs/SELF-HOSTED-MIGRATION.md`) but hasn't been tested.
- **PWA vs Capacitor**: Web push needs a service worker. Do we go full PWA (offline shell, installable) or keep Capacitor as the primary mobile path?
- **Jarvis autonomy**: How much should Jarvis act without asking? Currently it proposes via `agent_suggestions` and waits. Future versions could auto-create tasks, auto-link ideas, or proactively journal-prompt based on detected patterns.
- **Monetization**: Not designed yet. The data portability commitment (full export) means users are never locked in. Value has to come from the AI and the habit loop, not from holding data hostage.

---

## Anti-Goals

These are not bugs or missing features. They are deliberate choices:

- **Not a social network.** Accountability partners (1:1) maybe later. Feed/likes/followers — never.
- **Not a generic note-taking app.** We're structured and opinionated. Not competing with Notion.
- **Not an AI chatbot.** AI is embedded in the workflow, not a conversation. No "ask me anything."
- **Not a therapist.** We detect patterns and suggest strategies. We don't diagnose or treat. Clear disclaimers always.

---

## Running the Project

```bash
npm run dev            # Vite dev server on :5000
npm run build          # Typecheck + production build
npm run test           # 217 unit tests
npm run test:e2e       # 8 Playwright E2E tests
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint (0 errors target)
npm run types:generate # Regenerate Supabase types from local DB
```

Environment: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. AI keys (`LLM_API_KEY`, `LLM_ENDPOINT`, `LLM_MODEL`, `GROQ_API_KEY`) are Edge Function secrets set in the Supabase dashboard — never in client code.

Deployed to `app.mycommit.net` via rsync to Hostinger VPS (port 65002).

---

_160 commits. 30,000 lines of TypeScript. 24 migrations. 217 tests. Three languages. One loop._

_The COMMIT framework is the seed. The product is the soil, water, and sunlight. The job is to make growth inevitable._
