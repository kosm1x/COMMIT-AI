# Self-Hosted Migration Guide

How to move COMMIT-AI off Supabase onto self-managed infrastructure.

---

## Current Database Specs

### Schema: 15 Tables, 22 Migrations

**Data hierarchy** (4-level, nullable FK chain):

```
visions → goals → objectives → tasks
```

Each level has: `user_id` (FK → auth.users CASCADE), `status` (not_started | in_progress | completed | on_hold), `priority` (high | medium | low), `order` (integer), `modified_by` (user | jarvis | system), `last_edited_at`, `created_at`, `updated_at`.

**Supporting tables:**

| Table | Purpose | Key Constraints |
|-------|---------|-----------------|
| `journal_entries` | Daily reflections | `modified_by` provenance |
| `ai_analysis` | Journal emotion/pattern analysis | UNIQUE on `entry_id` (1:1 with journal) |
| `ideas` | Creative capture | Status: draft/active/completed/archived |
| `idea_connections` | Links between ideas | CHECK `idea_id != connected_idea_id`, strength 1-100 |
| `idea_ai_suggestions` | AI completions/enhancements for ideas | FK → ideas CASCADE |
| `mind_maps` | Mermaid diagram storage | `problem_statement` + `mermaid_syntax` |
| `daily_plans` | Day-level planning | UNIQUE `(user_id, plan_date)` |
| `daily_plan_tasks` | Task slots within plans | Time slot enum: morning/afternoon/evening/night |
| `task_completions` | Recurring task completion log | UNIQUE `(task_id, completion_date)` |
| `user_preferences` | Theme, language, onboarding state | UNIQUE on `user_id`, `ai_feedback` JSONB |
| `agent_suggestions` | Jarvis AI proposals | Status: pending/accepted/rejected/expired |

### PostgreSQL Extensions

| Extension | Purpose | Self-Hosted Availability |
|-----------|---------|--------------------------|
| `pg_net` | Async HTTP from triggers (webhook to Edge Functions) | [supabase/pg_net](https://github.com/supabase/pg_net) or replace with app-level webhooks |
| `pg_cron` | Daily task pruning job at 03:00 UTC | [citusdata/pg_cron](https://github.com/citusdata/pg_cron) — standard extension |

### Functions & Triggers (23 total)

| Function | Type | Purpose |
|----------|------|---------|
| `update_timestamps()` | BEFORE UPDATE trigger | Auto-set `updated_at` + `last_edited_at` on hierarchy tables + journal |
| `prune_completed_tasks(interval)` | SECURITY DEFINER RPC | Delete completed non-recurring tasks older than retention window (default 15 days). Called by pg_cron daily + client `.rpc()` on login |
| `notify_jarvis()` | AFTER INSERT/UPDATE trigger | Forward row changes on tasks/goals/objectives/journal to `commit-events` Edge Function via `net.http_post()`. Skips `modified_by='jarvis'` to prevent echo loops |

### Row-Level Security (RLS)

All 15 tables enforce `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE.

Special case: `agent_suggestions` INSERT requires `auth.jwt()->>'role' = 'service_role'` — only the backend can propose suggestions, never the client.

### Composite Indexes

Optimized for common query patterns:

```
(user_id, status)              — on visions, goals, objectives, tasks
(user_id, entry_date DESC)     — journal_entries
(user_id, plan_date DESC)      — daily_plans
(user_id, due_date)            — tasks
(user_id, completion_date DESC)— task_completions
(completed_at) WHERE status='completed' AND is_recurring=false — prune candidates
(user_id, status) WHERE status='pending' — agent_suggestions
```

### Edge Functions (Deno, deployed on Supabase)

**`ai-proxy`** (~120 LOC) — LLM request proxy:
- Validates JWT, extracts user via `supabase.auth.getUser()`
- Routes to Jarvis first (25s timeout), falls back to configurable LLM (Groq default)
- Injects language instruction (en/es/zh)
- Env: `JARVIS_API_URL`, `JARVIS_API_KEY`, `LLM_API_KEY`, `LLM_ENDPOINT`, `LLM_MODEL`

**`commit-events`** (~80 LOC) — Database webhook receiver:
- Validates service role key from Authorization header
- Computes row diffs (old vs new), forwards to Jarvis
- Non-blocking: always returns 200 to avoid blocking DB transactions
- Env: `SUPABASE_SERVICE_ROLE_KEY`, `JARVIS_API_URL`, `JARVIS_API_KEY`

### Auth Integration Points

| Supabase Auth Method | Usage Location |
|----------------------|----------------|
| `signUp({ email, password })` | Registration (Login.tsx) |
| `signInWithPassword({ email, password })` | Login (Login.tsx) |
| `signOut()` | Logout + localStorage cleanup (AuthContext) |
| `getSession()` | Session check on app load (AuthContext) |
| `onAuthStateChange()` | Auth state subscription (AuthContext) |
| `resetPasswordForEmail()` | Password reset flow (Login.tsx) |
| `updateUser({ password })` | Password update in recovery (AuthContext) |
| `getUser()` | JWT validation in Edge Functions |

Biometric auth (WebAuthn via Capacitor plugin) is a separate layer on top.

### Client SDK Usage

The `@supabase/supabase-js` client is used across 30+ files for:
- **Query builder**: `.from().select().eq().order().limit().range()` — CRUD on all tables
- **Auth**: `.auth.*` methods listed above
- **RPC**: `.rpc('prune_completed_tasks')` — single stored procedure call
- **NOT used**: Storage, Realtime, file uploads, pub-sub

---

## Self-Hosted Target Architecture

### Desirable Characteristics

1. **Fully open-source stack** — no vendor lock-in, every component replaceable
2. **Single-server deployable** — must run on a single VPS (4 GB+ RAM) for cost efficiency, with horizontal scaling possible later
3. **PostgreSQL-native** — keep the existing schema, RLS, triggers, and migrations as-is where possible
4. **JWT-compatible auth** — RLS policies rely on `auth.uid()` from JWT claims; the replacement must set the same claim
5. **Zero downtime data migration** — export from Supabase, import to self-hosted, switch DNS
6. **Container-friendly** — Docker Compose for local dev and production, easy to back up and restore
7. **Secrets in environment** — no hardcoded keys in database functions or source code
8. **Observability** — structured logging, health checks, request tracing on the API layer

### Recommended Stack

```
┌─────────────────────────────────────────────────┐
│  React SPA (Vite)        — unchanged frontend   │
│  served via Caddy/Nginx                         │
├─────────────────────────────────────────────────┤
│  API Layer (Node.js / Fastify or Express)       │
│  ├── /auth/*        — auth routes               │
│  ├── /api/ai-proxy  — LLM proxy (port of Edge)  │
│  ├── /api/events    — webhook receiver (port)    │
│  └── /api/rpc/*     — stored procedure calls     │
├─────────────────────────────────────────────────┤
│  PostgreSQL 15+                                  │
│  ├── pg_cron        — task pruning schedule      │
│  ├── (pg_net OR app-level webhooks)              │
│  └── RLS with JWT claims from custom auth        │
├─────────────────────────────────────────────────┤
│  Auth Provider (pick one):                       │
│  ├── Keycloak       — full-featured, battle-tested│
│  ├── Authentik      — lighter, modern UI         │
│  ├── Supertokens    — open-source, simple        │
│  └── Custom JWT     — minimal, if you want full  │
│                       control                    │
└─────────────────────────────────────────────────┘
```

---

## Migration Instructions

### Phase 1: PostgreSQL Setup

**Estimated effort: Low**

1. Provision PostgreSQL 15+ (Docker, managed, or bare metal).

2. Install extensions:
   ```bash
   # pg_cron
   apt install postgresql-15-cron   # or from source
   # Add to postgresql.conf:
   shared_preload_libraries = 'pg_cron'
   cron.database_name = 'commit_ai'
   ```

3. Create the `auth` schema stub. Supabase provides `auth.users` and `auth.uid()` — you need equivalents:
   ```sql
   CREATE SCHEMA IF NOT EXISTS auth;

   CREATE TABLE auth.users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email TEXT UNIQUE NOT NULL,
     encrypted_password TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );

   -- RLS helper: extract user ID from JWT claim
   CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
     SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::UUID;
   $$ LANGUAGE sql STABLE;

   -- RLS helper: extract full JWT
   CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB AS $$
     SELECT current_setting('request.jwt.claims', true)::jsonb;
   $$ LANGUAGE sql STABLE;
   ```

4. Run all 22 migrations in order:
   ```bash
   for f in supabase/migrations/*.sql; do
     psql -d commit_ai -f "$f"
   done
   ```

5. Fix `notify_jarvis()` — replace the hardcoded Supabase URL and service role JWT:
   ```sql
   -- Replace the hardcoded webhook URL with your self-hosted endpoint
   CREATE OR REPLACE FUNCTION notify_jarvis() RETURNS TRIGGER AS $$
   BEGIN
     PERFORM net.http_post(
       url := current_setting('app.webhook_url'),          -- set via ALTER DATABASE
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || current_setting('app.service_role_key')
       ),
       body := jsonb_build_object(
         'type', TG_OP,
         'table', TG_TABLE_NAME,
         'schema', TG_TABLE_SCHEMA,
         'record', to_jsonb(NEW),
         'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
       )
     );
     RETURN NEW;
   EXCEPTION WHEN OTHERS THEN
     RAISE WARNING 'notify_jarvis failed: %', SQLERRM;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

   Then set the custom GUCs:
   ```sql
   ALTER DATABASE commit_ai SET app.webhook_url = 'https://your-api.example.com/api/events';
   ALTER DATABASE commit_ai SET app.service_role_key = 'your-service-role-key';
   ```

   **Alternative (simpler):** Drop `pg_net` entirely. Remove the `notify_jarvis()` triggers and implement webhooks at the API layer (fire-and-forget POST after each mutation). This eliminates the `pg_net` dependency.

6. Schedule task pruning:
   ```sql
   SELECT cron.schedule(
     'prune-completed-tasks',
     '0 3 * * *',
     $$SELECT prune_completed_tasks('15 days')$$
   );
   ```

### Phase 2: Authentication

**Estimated effort: High — this is the critical path**

1. Choose an auth provider. For minimal effort with maximum compatibility:
   - **Supertokens** if you want drop-in email/password with JWT
   - **Keycloak** if you need enterprise features later
   - **Custom** if you want full control (just bcrypt + JWT signing)

2. Implement the auth endpoints your frontend calls:
   ```
   POST /auth/signup          → create user in auth.users, return JWT
   POST /auth/signin          → verify password, return JWT
   POST /auth/signout         → invalidate session (optional server-side)
   POST /auth/reset-password  → send reset email
   POST /auth/update-user     → update password (with valid reset token)
   GET  /auth/session         → return current user from JWT
   ```

3. JWT must include these claims (RLS depends on them):
   ```json
   {
     "sub": "<user-uuid>",
     "role": "authenticated",
     "exp": 1234567890
   }
   ```
   For the service role (Jarvis backend inserting suggestions):
   ```json
   {
     "sub": "<service-uuid>",
     "role": "service_role"
   }
   ```

4. Set JWT claims on each database request. Your API layer must do this before running queries:
   ```sql
   SELECT set_config('request.jwt.claims', '{"sub":"<user-id>","role":"authenticated"}', true);
   ```
   This makes `auth.uid()` and `auth.jwt()` work with the existing RLS policies.

5. Migrate existing users:
   ```bash
   # Export from Supabase (via dashboard or API)
   # Import into your auth.users table, preserving UUIDs
   # All FK references (user_id) remain valid
   ```

6. Update the frontend `AuthContext`:
   - Replace `supabase.auth.*` calls with fetch calls to your auth endpoints
   - Keep the same `onAuthStateChange`-style pattern (poll or use a state machine)
   - Store JWT in localStorage (same as current behavior)

### Phase 3: API Layer (Edge Function Replacement)

**Estimated effort: Medium**

1. Create a Node.js server (Fastify recommended for performance):
   ```
   src/
     server.ts
     routes/
       auth.ts          — signup, signin, signout, reset, update
       ai-proxy.ts      — port of supabase/functions/ai-proxy
       events.ts        — port of supabase/functions/commit-events
       rpc.ts           — prune_completed_tasks wrapper
     middleware/
       jwt.ts           — verify JWT, set request.jwt.claims on pg connection
     db.ts              — pg pool with per-request JWT claim injection
   ```

2. Port `ai-proxy` (straightforward — it's a fetch proxy):
   - Validate JWT from Authorization header
   - Try Jarvis first (25s timeout), fall back to LLM
   - Return JSON response
   - No Supabase-specific code needed

3. Port `commit-events` (even simpler):
   - Validate service role key
   - Compute diffs, POST to Jarvis
   - Always return 200

4. Add a query proxy or use PostgREST:
   - **Option A**: Use [PostgREST](https://postgrest.org/) as a drop-in replacement for Supabase's query API. It speaks the same `.from().select().eq()` protocol. The `@supabase/supabase-js` client can be pointed at PostgREST with minimal changes.
   - **Option B**: Write thin CRUD routes in your API server. More control, but more code.

   PostgREST is recommended — it preserves RLS, speaks the same API, and means near-zero frontend changes.

### Phase 4: Frontend Changes

**Estimated effort: Low (with PostgREST) / Medium (without)**

1. **With PostgREST**: Update `src/lib/supabase.ts` to point at your PostgREST URL:
   ```typescript
   import { createClient } from '@supabase/supabase-js'

   // Point at self-hosted PostgREST + auth
   const supabase = createClient<Database>(
     import.meta.env.VITE_API_URL,       // e.g. https://api.mycommit.net
     import.meta.env.VITE_ANON_KEY,      // your JWT signing public key or anon token
     { auth: { persistSession: true, autoRefreshToken: true } }
   )
   ```

2. **Without PostgREST**: Replace `@supabase/supabase-js` with a custom client. Every `.from('table').select()...` call (30+ files) needs updating. This is the most labor-intensive path.

3. Update auth calls in `AuthContext.tsx` and `Login.tsx` to use your auth endpoints.

4. Update environment variables:
   ```bash
   # Old
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...

   # New
   VITE_API_URL=https://api.mycommit.net
   VITE_ANON_KEY=your-anon-key
   ```

### Phase 5: Docker Compose (Production)

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: commit_ai
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    command: >
      postgres
      -c shared_preload_libraries='pg_cron'
      -c cron.database_name='commit_ai'

  postgrest:
    image: postgrest/postgrest
    environment:
      PGRST_DB_URI: postgres://authenticator:${DB_PASSWORD}@postgres:5432/commit_ai
      PGRST_DB_SCHEMAS: public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres]

  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://app:${DB_PASSWORD}@postgres:5432/commit_ai
      JWT_SECRET: ${JWT_SECRET}
      LLM_API_KEY: ${LLM_API_KEY}
      LLM_ENDPOINT: ${LLM_ENDPOINT}
      LLM_MODEL: ${LLM_MODEL}
      JARVIS_API_URL: ${JARVIS_API_URL}
      JARVIS_API_KEY: ${JARVIS_API_KEY}
    depends_on: [postgres]

  caddy:
    image: caddy:2
    ports: ["443:443", "80:80"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - ./dist:/srv           # Vite build output
      - caddy_data:/data

volumes:
  pgdata:
  caddy_data:
```

### Phase 6: Data Migration

1. Export data from Supabase:
   ```bash
   # Auth users
   supabase db dump --data-only --schema auth > auth_data.sql

   # App data
   supabase db dump --data-only --schema public > app_data.sql
   ```

2. Import into self-hosted PostgreSQL:
   ```bash
   psql -d commit_ai -f auth_data.sql
   psql -d commit_ai -f app_data.sql
   ```

3. Verify row counts match, FK integrity holds, and RLS policies pass with test JWTs.

### Phase 7: DNS Cutover

1. Build frontend with new env vars, deploy to self-hosted Caddy
2. Point `app.mycommit.net` at new server
3. Verify auth flow, CRUD operations, AI proxy, and Jarvis webhooks
4. Decommission Supabase project

---

## Migration Complexity Summary

| Component | Effort | Notes |
|-----------|--------|-------|
| PostgreSQL schema | **Low** | Pure SQL, run migrations in order |
| Extensions (pg_cron) | **Low** | Standard, well-documented |
| pg_net triggers | **Medium** | Replace with app-level webhooks or keep pg_net |
| Authentication | **High** | Deepest coupling: RLS, FKs, Edge Functions, frontend context |
| Edge Functions → API | **Medium** | ~200 LOC total, straightforward HTTP handlers |
| Client SDK | **Low** | Use PostgREST to keep `@supabase/supabase-js` working |
| Data migration | **Low** | `pg_dump` / `pg_restore`, preserve UUIDs |
| DNS + TLS | **Low** | Caddy auto-TLS or existing Hostinger setup |

**Critical path**: Auth replacement → RLS compatibility → API layer → frontend update.

**Fastest path**: PostgreSQL + PostgREST + Supertokens + Caddy. This minimizes frontend changes and keeps the existing query builder working.
