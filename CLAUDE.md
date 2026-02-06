# OnCall Development Context

Hospital shift scheduling system for clinics. Semi-automated scheduling with SQLite persistence.

## Quick Commands

```bash
# Backend (port 3000)
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
  index.ts              # Express app entry, DB init, route wiring
  db/
    connection.ts       # Schema creation (9 tables), WAL + FK pragmas
    seed.ts             # Seeds workers, config, settings, holidays if empty
  repositories/         # SQL operations (factory pattern: createXxxRepo(db))
    workerRepo.ts, availabilityRepo.ts, scheduleRepo.ts,
    configRepo.ts, holidayRepo.ts, settingsRepo.ts
  routes/               # Express route handlers
    workers.ts, availability.ts, schedules.ts, config.ts
  services/
    scheduler.ts        # Pure function: generates schedule from inputs
    holidayService.ts   # Wraps date-holidays package
  types/index.ts        # All TypeScript interfaces
  data/initialData.ts   # Seed data (39 workers, default config)

frontend/src/
  App.tsx               # Main app with 3 tabs
  components/           # WorkersTab, ScheduleTab, ConfigurationTab,
                        # WorkerForm, AvailabilityEditor
  hooks/useApi.ts       # All API client hooks
  types/index.ts        # TypeScript interfaces (mirrors backend)
  utils/helpers.ts      # Constants, formatters
```

## Key Patterns

- **Repositories**: Factory functions `createXxxRepo(db)` returning CRUD methods. Handle snake_case (DB) <-> camelCase (TS) mapping internally.
- **Scheduler**: Pure function - receives arrays, returns assignments. No DB access. Holiday-aware (holidays use Sunday requirements).
- **Composite PKs**: `weekly_availability`, `monthly_schedules`, `holidays` use composite primary keys with `INSERT OR REPLACE` for upserts.
- **Soft deletes**: Workers use `active` flag, not hard delete.

## Database Tables

```
workers                  - id, name, role, type, can_double_shift, year_of_study, start_date, end_date, active
weekly_availability      - worker_id, year, week, day, shift_type, status (composite PK)
monthly_schedules        - year, month, generated_at (composite PK)
shift_assignments        - id, schedule_year, schedule_month, date, shift_type, position, worker_id
shift_configurations     - id, name, description, is_active
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
- `/api/workers` - CRUD
- `/api/availability` - preferences
- `/api/schedules` - generation and management
- `/api/config` - shift config, countries, settings, holidays

## Holidays

- Uses `date-holidays` npm package (offline, 100+ countries)
- Default: Finland (FI)
- Public holidays auto-populated on country change
- Holidays treated as Sundays for scheduling (use Sunday's position requirements)
