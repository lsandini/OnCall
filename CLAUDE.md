# OnCall Development Context

Hospital on-call scheduling system. Multi-clinic, bilingual (EN/FI), semi-automated scheduling with SQLite persistence.

## Quick Commands

```bash
# Backend (port 3001)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev

# Reset database
rm backend/data/oncall.db
```

## Tech Stack

- **Backend**: Node.js + Express + TypeScript + better-sqlite3 (WAL mode)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Database**: SQLite at `backend/data/oncall.db` (auto-created and seeded on first run)

## Project Structure

```
backend/src/
  index.ts              # Express app entry, DB init, route wiring, error handler
  db/
    connection.ts       # Schema creation (10 tables), WAL + FK pragmas, multi-clinic migration
    seed.ts             # Seeds clinics, workers, config, settings, holidays if empty
  repositories/         # SQL operations (factory pattern: createXxxRepo(db))
    clinicRepo.ts, workerRepo.ts, availabilityRepo.ts, scheduleRepo.ts,
    configRepo.ts, holidayRepo.ts, settingsRepo.ts
  routes/               # Express route handlers
    clinics.ts, workers.ts, availability.ts, schedules.ts, config.ts
  services/
    scheduler.ts        # Pure function: generates schedule from inputs
    holidayService.ts   # Wraps date-holidays package
  types/index.ts        # All TypeScript interfaces
  data/initialData.ts   # Seed data (workers + default configs per clinic)

frontend/src/
  App.tsx               # Main app with 4 tabs + clinic selector
  components/           # WorkersTab, ScheduleTab, ConfigurationTab, AdminTab,
                        # WorkerForm, AvailabilityEditor
  hooks/useApi.ts       # All API client functions
  i18n/                 # Custom i18n system (no library)
    types.ts            # Translations interface
    locales/en.ts       # English translations
    locales/fi.ts       # Finnish translations
    index.tsx           # I18nProvider + useTranslation hook
  types/index.ts        # TypeScript interfaces (mirrors backend)
  utils/helpers.ts      # Locale-aware formatters, color maps, specialty name translation
```

## Key Patterns

- **Multi-clinic**: `clinics` table with `clinic_id` FK on workers, shift_configurations, monthly_schedules, shift_assignments. All data queries scoped by clinic. Settings/holidays/language remain global.
- **i18n**: Custom React Context in `frontend/src/i18n/`. `useTranslation()` returns `{ t, locale, setLocale, translations }`. Locale-aware helpers in `utils/helpers.ts`. Backend stores language in settings table.
- **Repositories**: Factory functions `createXxxRepo(db)` returning CRUD methods. Handle snake_case (DB) <-> camelCase (TS) mapping internally. Prepared statements for performance.
- **Scheduler**: Pure function - receives arrays, returns assignments. No DB access. Holiday-aware (holidays use Sunday requirements).
- **Composite PKs**: `weekly_availability`, `monthly_schedules`, `holidays` use composite primary keys with `INSERT OR REPLACE` for upserts.
- **Soft deletes**: Workers use `active` flag, not hard delete. Availability records cleaned up on soft-delete.
- **Admin mode**: Configuration and Administration tabs gated behind a toggle in the header (persisted to localStorage).

## Database Tables

```
clinics                  - id (TEXT PK), name, created_at
workers                  - id, name, role, type, can_double_shift, year_of_study, start_date, end_date, active, clinic_id
weekly_availability      - worker_id, year, week, day, shift_type, status (composite PK)
monthly_schedules        - clinic_id, year, month, generated_at (composite PK)
shift_assignments        - id, clinic_id, schedule_year, schedule_month, date, shift_type, position, worker_id
shift_configurations     - id, name, description, is_active, clinic_id
shift_type_definitions   - config_id, id, name, start_time, end_time, crosses_midnight
daily_shift_requirements - config_id, day_of_week, shift_type_id, positions
settings                 - key, value (key-value store)
holidays                 - date, name, type, country (composite PK: date+country)
```

## Domain Model

- **Roles**: `senior_specialist` (supervisor only), `resident` (1st/2nd/3rd line), `student` (2nd/3rd line only)
- **Types**: `permanent`, `external` (externals can do double shifts: evening+night)
- **Shift types**: `day` (weekends), `evening` (weekdays), `night`
- **Line positions**: `supervisor`, `first_line`, `second_line`, `third_line`
- **Availability**: `available` (default), `preferred`, `unavailable`

## API Base

All endpoints prefixed with `/api/`. Main routes:
- `/api/clinics` - Clinic CRUD, stats, safe delete
- `/api/workers` - CRUD (scoped by clinicId query param)
- `/api/availability` - Preferences with validation
- `/api/schedules` - Generation, gap-filling, manual edits (scoped by clinicId)
- `/api/config` - Shift config, countries, settings, holidays

## Color Palette

Hospital/operating theatre inspired. Three muted color families only — defined as CSS custom properties in `frontend/src/index.css` under `@theme`.

- **clinic** (surgical scrub sage-teal): Primary actions, buttons, active states, student role indicators
- **steel** (instrument cool gray): Neutrals, text, borders, backgrounds, resident role indicators, night shift
- **clay** (muted terracotta): The single warm accent — danger, alerts, supervisor role, weekends, holidays, external workers

Semantic mappings in `frontend/src/utils/helpers.ts` (`SHIFT_COLORS`, `POSITION_COLORS`). Do not introduce new Tailwind color families (no `rose`, `amber`, `sky`, `emerald`, `indigo`, `violet`). All UI color needs should be met by `clinic`, `steel`, and `clay` at various shade levels (50–900).

## Holidays

- Uses `date-holidays` npm package (offline, 100+ countries)
- Default: Finland (FI), curated to 8 Nordic/European countries
- Public holidays auto-populated on country change
- Holidays treated as Sundays for scheduling (use Sunday's position requirements)

## i18n

- Custom system in `frontend/src/i18n/` (no external library)
- Supported locales: `'en' | 'fi'`
- Adding a language: create locale file in `locales/`, add to `Locale` union in `types.ts`, import in `index.tsx`
- Clinic specialty names translate bidirectionally via `getClinicDisplayName()` / `getSpecialtyKey()` in helpers
- Backend language stored in `settings` table (key: `language`)
