# COMMIT-AI: North Star

> The app that turns self-reflection into self-improvement — and makes the habit stick.

## The Problem

People set goals, journal for a week, then stop. Not because they lack willpower — because their tools don't close the loop. Todoist tracks tasks but doesn't ask _why_. Journaling apps capture feelings but don't connect them to action. Goal trackers show progress bars but never say _"you tend to quit at week 3 — let's plan for that."_

Personal growth requires a closed loop: **reflect > plan > act > measure > reflect**. No single tool does all five well. Users cobble together 3-4 apps, lose context between them, and eventually abandon the system.

## The Vision

COMMIT-AI is the **growth companion that understands your patterns and keeps you moving.** It's the only tool that connects what you _feel_ (journal) to what you _want_ (objectives) to what you _do_ (tasks) to what you _learn_ (tracking) — and uses AI to find the patterns you can't see yourself.

The framework is the product. The AI makes the framework stick.

### What "done" looks like

A user who has been on COMMIT for 90 days should be able to say:

- _"I journal 4-5 days a week because the app reminds me and I actually want to see what the AI notices."_
- _"I broke a big life goal into 12 tasks and I've completed 9. I can see my progress."_
- _"The app told me I'm most productive on Thursdays and most reflective on Sundays. I plan my week around that now."_
- _"When I started drifting from a goal, the app noticed before I did."_
- _"I don't want to leave because my history here is valuable — it's the record of who I'm becoming."_

## Core Beliefs

### 1. The loop is the product

Context > Objectives > MindMap > Ideate > Track is not a feature list — it's a _process_. Every feature we build should strengthen the loop. If a feature doesn't connect at least two phases, it probably shouldn't exist.

### 2. AI should know you, not just answer you

Stateless LLM calls are a commodity. Our AI advantage comes from context accumulation: your goals, your patterns, your history, your preferences. Every AI interaction should feel like talking to someone who's been paying attention — not a stranger reading your prompt for the first time.

### 3. Retention is the feature

A beautiful dashboard that nobody opens after week 2 is worthless. Every feature needs a retention mechanism: a reason to come back tomorrow. Streaks, nudges, insights that compound, progress that's visible. The app should feel _worse_ to abandon than to use.

### 4. Guided > flexible

Power users will explore. New users need guardrails. The first week should be opinionated: "Do this, then this, then this." We earn the right to show complexity after we've delivered value.

### 5. Honest > impressive

A fake AI insight is worse than no insight. If the model fails, say so. If the analysis is shallow, admit it. Users will forgive "AI unavailable" — they won't forgive discovering their emotional analysis was boilerplate.

## Strategic Priorities (in order)

### P0: Make the habit stick

The #1 reason users churn is they forget. Push notifications, daily nudges, streak mechanics, and a 7-day onboarding flow that teaches the framework _by doing it_. This is the foundation everything else depends on.

- 7-day guided onboarding (progressive framework introduction)
- Push notifications (daily journal reminder, streak alerts, task due dates)
- Streak celebrations (milestones, not just counters)
- Weekly digest ("Here's what you accomplished. Here's what's next.")

### P1: Make the AI real

The #2 reason users churn is the AI feels generic. Fix this by giving every AI call the user's context: recent emotions, active goals, completion patterns, and past suggestions they accepted or rejected.

- Contextual AI prompts (pass goals + history + preferences)
- Honest failure states (no more silent mock fallbacks)
- Feedback loop (track accept/reject, adapt future suggestions)
- Compounding insights ("You've been stressed 4 of the last 7 entries")

### P2: Simplify the on-ramp

The hierarchy (Vision > Goal > Objective > Task) is powerful but intimidating. New users need a simpler entry point that reveals complexity gradually.

- First-run wizard ("What's one thing you want to improve?")
- Smart defaults (auto-create a Vision > Goal > first Task from one sentence)
- Progressive disclosure (show 2 levels first, unlock 4 when ready)
- Empty-state guidance (contextual hints on every blank page)

### P3: Make progress visible and emotional

The tracking dashboard shows data but doesn't create feelings. Transform it from "here are numbers" to "here's proof you're growing."

- Interpretive insights (not just "12 tasks completed" but "that's 40% more than last month")
- Pattern detection ("You journal more on Mondays and complete more tasks on Thursdays")
- Milestone celebrations (visual, shareable, memorable)
- "Year in review" exportable report

### P4: Go mobile-first

Personal growth happens throughout the day, not at a desk. The mobile experience needs to feel native, not wrapped.

- Offline journaling with sync
- Push notifications (see P0)
- Quick-add widgets (journal entry, task check-off)
- Native feel (haptics, transitions, platform conventions)

## Anti-Goals

- **Not a social network.** Accountability partners (1:1) later, maybe. Feed/likes/followers — never.
- **Not a generic note-taking app.** We're not competing with Notion or Obsidian. We're structured and opinionated.
- **Not an AI chatbot.** AI is embedded in the workflow, not a chat interface. No "ask me anything" — instead, insights surface _where you need them_.
- **Not a therapist.** We detect patterns and suggest coping strategies. We don't diagnose, treat, or replace professional help. Clear disclaimers always.

## Success Metrics

| Metric                    | Current (est.) | 90-day target                       | Why it matters                          |
| ------------------------- | -------------- | ----------------------------------- | --------------------------------------- |
| D7 retention              | ~15%           | 40%                                 | Users who stay a week will stay a month |
| Weekly active journaling  | unknown        | 3+ entries/week for active users    | Core habit formation                    |
| Objective completion rate | unknown        | 60% of created objectives completed | Framework is working                    |
| AI suggestion acceptance  | unknown        | 30%+ acceptance rate                | AI is relevant, not noise               |
| Push notification opt-in  | 0% (not built) | 70% of mobile users                 | Retention engine online                 |

## Versioning Strategy

| Version  | Theme           | Core deliverable                                                |
| -------- | --------------- | --------------------------------------------------------------- |
| **v4.0** | Retention       | Guided onboarding, push notifications, honest AI, weekly digest |
| **v4.1** | Intelligence    | Contextual AI, feedback loops, compounding insights             |
| **v4.2** | Mobile          | Offline support, native widgets, haptics                        |
| **v5.0** | Network effects | Accountability partners, shareable milestones, data export      |

---

_The COMMIT framework is the seed. The product is the soil, water, and sunlight. Our job is to make growth inevitable._
