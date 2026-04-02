# Deployment Guide

COMMIT Journal is a React SPA with a Supabase backend. The build produces static files (`dist/`) deployable to any hosting provider.

## Prerequisites

- Node.js 18+
- A Supabase project with Auth enabled
- AI API key set as a Supabase Edge Function secret (server-side only)

## Pre-Deployment Checklist

- [ ] Environment variables set in hosting platform (see below)
- [ ] All database migrations applied in order
- [ ] RLS policies configured for all 14 tables
- [ ] Supabase redirect URLs include production domain
- [ ] `npm run test` passes (215 tests)
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm run preview` tested locally
- [ ] Authentication flow verified
- [ ] AI features work (or gracefully fall back to mock data)
- [ ] Tested on mobile devices

## Environment Variables

**Client-side** (set in hosting platform):

```
VITE_SUPABASE_URL=https://db.mycommit.net
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Server-side** (self-hosted: `/opt/supabase/.env` on VPS):

```
LLM_API_KEY=your_api_key
LLM_MODEL=qwen-qwq-32b          # optional, defaults to Groq Qwen
LLM_ENDPOINT=https://...         # optional, defaults to Groq
```

No API keys should appear in client-side code or `VITE_` env vars.

## Database Setup

### Tables (14)

`journal_entries`, `ai_analysis`, `visions`, `goals`, `objectives`, `tasks`, `task_completions`, `ideas`, `idea_connections`, `idea_ai_suggestions`, `mind_maps`, `user_preferences`, `daily_planner`, `daily_plan_tasks`

All tables require RLS policies with `user_id` filtering.

### Migrations

Apply all files from `supabase/migrations/` in chronological order:

1. `20251122030129_create_initial_schema.sql`
2. `20251122032605_add_flexible_hierarchy_and_timestamps.sql`
3. `20251122042133_add_unique_constraint_to_ai_analysis.sql`
4. `20251122042511_add_primary_emotion_to_journal_entries.sql`
5. `20251122044903_create_mind_maps_table.sql`
6. `20251122065603_create_user_preferences_table.sql`
7. `20251122184941_create_ideas_system.sql`
8. `20251122212755_add_vision_table.sql`
9. `20251123000000_add_recurring_tasks.sql`
10. `20251124000000_add_target_date_to_objectives.sql`
11. `20251125000000_add_order_field.sql`
12. `20260118000000_add_document_links_to_tasks.sql`
13. `20260120000000_add_user_preferences_fields.sql`
14. `20260129000000_add_daily_planner.sql`

### Supabase Auth

- Enable Email/Password authentication
- Add production URL to Site URL and Redirect URLs

## Build

```bash
npm install
npm run test          # Run test suite
npm run typecheck     # Type check
npm run build         # Production build (includes typecheck via prebuild)
npm run preview       # Test production build locally
```

## Deployment Options

### Vercel

1. `npm i -g vercel && vercel`
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Project Settings > Environment Variables
3. `vercel --prod`

### Netlify

1. `npm i -g netlify-cli && netlify deploy --prod`
2. Build command: `npm run build`, publish directory: `dist`
3. Set environment variables in dashboard

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Post-Deployment

1. Verify environment variables are set correctly
2. Update Supabase redirect URLs for production domain
3. Test: registration, login, journal, objectives, mind maps, ideas, AI features
4. Set up error tracking (Sentry, LogRocket) and monitoring

## Security Considerations

1. **API keys are server-side only** — stored as Supabase Edge Function secrets, never in client code
2. **RLS policies** on all 14 tables enforce per-user data isolation
3. **CORS** — configure in Supabase for your production domain
4. **HTTPS** required in production
5. **Input validation** — all user inputs sanitized via `src/utils/security.ts`

## Troubleshooting

### Build Errors

- Ensure Node.js 18+ and all dependencies installed (`npm install`)
- Clear and reinstall: `rm -rf node_modules && npm install`
- Run `npm run typecheck` to surface type errors

### Runtime Errors

- Check browser console for errors
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Check Supabase connection and RLS policies
- AI features fall back to mock data if Edge Function is unreachable

### Performance

- Check bundle sizes in build output
- Code splitting is pre-configured (React, Supabase, Mermaid vendor chunks)
- All routes use lazy loading
