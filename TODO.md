# OnCall — TODO

## 1. Authentication

- **Sign in with Microsoft** (`/common` tenant) — supports both hospital organizational accounts and personal Microsoft accounts
- **Magic link fallback** — email-based passwordless login for external/future workers without a Microsoft account
- Admin pre-creates workers with email; authentication links login identity to existing worker record
- Both methods resolve to the same internal session/JWT
- `users` table (or column on `workers`) links `microsoft_oid` or `email` to the worker record

## 2. Onboarding

- Detect first run via `onboarding_complete` setting; show wizard instead of main app if unset
- **Step 1**: Language (EN/FI, switches UI immediately) + Country (determines holidays)
- **Step 2**: Hospital/organization name (stored in `settings`)
- **Step 3**: Create clinics (free text + suggested templates as chips; each gets default shift config)
- **Step 4**: Summary + "Get Started" → sets `onboarding_complete = true`
- Workers, shift config tweaking, holidays editing stay out of onboarding (done in normal UI after)
- Single `POST /api/onboarding` endpoint, all setup in one transaction
- `seed.ts` stops pre-creating clinics/workers/configs; onboarding replaces that

## 3. Reset DB / Reset Monthly Schedule

- **Reset monthly schedule**: deletes `shift_assignments` + `monthly_schedules` record only; never touch `weekly_availability`
- Warning must clarify: availability preserved, but already-notified workers can't be un-notified
- Offer data export (CSV/JSON) before deletion
- **Reset database**: deletes everything, triggers onboarding again; type-to-confirm ("type RESET")
- Offer full data export before DB reset
- Both actions admin-only; cascade deletes in correct order; log who/when (once auth exists)

## 4. AI-Assisted Scheduling

- **Infra**: Ollama container in Docker Compose (internal only), `qwen2.5:0.5b` (~400MB)
- **Phase 1**: NL text field alongside tap-to-toggle calendar. LLM parses NL into availability (worker confirms) + soft preferences (stored in `worker_preferences` table)
- **Phase 2**: Scheduler generates multiple valid schedules; scoring function ranks them against soft preferences (co-worker affinities, day rankings). Hard constraints never violated.

## 5. Mobile App (Expo)

- **Thin client**: only two screens — "My Schedule" (own shifts) and "My Availability" (tap-to-toggle + NL preferences)
- No admin features; employment period, roles, clinic assignment managed by admin in the web app
- **Auth**: Microsoft sign-in via `expo-auth-session`, same Azure app registration as web
- **Server discovery**: first launch asks for hospital OnCall URL (e.g. `oncall.ekhva.fi`); app fetches auth config from backend. Workers at multiple hospitals can switch organizations.
- Clinic auto-determined from worker record — no clinic selector needed
- Share TS types, API client, i18n translations with web frontend via local workspace
- Optional later: push notifications when new schedule is published

---

**Note**: Responsive design is not a priority. Admins use desktop; workers will use the mobile app. Just ensure nothing is broken on tablet-sized screens (no hidden overflow, scrollable tables). Address opportunistically.
