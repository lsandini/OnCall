# OnCall - Hospital Shift Management System

A semi-automated shift scheduling system for hospital clinics, backed by a persistent SQLite database.

## Features

- **Configurable Shift Structure**: Define shift types, times, and daily position requirements per clinic
- **Personnel Management**: Track senior specialists, residents, and medical students with employment dates
- **Employment Duration**: Set start/end dates for workers - they only appear in months where they're employed
- **Availability Calendar**: Monthly calendar view to mark preferred/unavailable days
- **Public Holidays**: Country-aware public holiday support (100+ countries) using the `date-holidays` package - holidays are treated as Sundays for scheduling purposes
- **Custom Holidays**: Admins can add/remove custom holidays alongside auto-populated public ones
- **Auto-Scheduling**: Balance workload while respecting preferences, employment dates, and holidays
- **Manual Override**: Click any assignment to swap workers
- **Distribution Lists**: Printable monthly schedule table for distribution
- **External Staff**: Support for on-demand workers with double-shift capability
- **Persistent Storage**: SQLite database - all data survives server restarts

## Shift Structure (Default: Internal Medicine)

The shift structure is configurable per clinic via the Configuration tab.

### Supervisor On-Call Schedule
- **Mon-Thu**: 15:00 to 08:00 next day
- **Friday**: 15:00 to 09:00 Saturday
- **Saturday**: 09:00 to 09:00 Sunday (24h)
- **Sunday**: 09:00 to 08:00 Monday

### Weekdays (Mon-Fri)
- **Evening (15:00-22:00)**: Supervisor + 1st Line + 2nd Line (+ 3rd Line on Mon/Fri)
- **Night (22:00-08:00)**: 1st Line only (Supervisor continues from evening)

### Weekends & Public Holidays (Sat-Sun + holidays)
- **Day (09:00-22:00)**: Supervisor + 1st Line + 2nd Line
- **Night**: 1st Line only (Supervisor continues)

Public holidays falling on weekdays are treated as Sundays - the scheduler uses Sunday's position requirements and shift types for those days.

## Quick Start

```bash
# Install and start backend
cd backend
npm install
npm run dev

# In another terminal - install and start frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

On first run, the database is created at `backend/data/oncall.db` and seeded with 39 workers, the default Internal Medicine shift configuration, and Finnish public holidays for the current and next year. Subsequent restarts reuse the existing database.

To reset to a clean state, delete `backend/data/oncall.db` and restart the backend.

## Architecture

### Backend

- **Runtime**: Node.js + Express + TypeScript
- **Database**: SQLite via `better-sqlite3` (WAL mode, foreign keys enabled)
- **Schema**: 9 fully normalized tables (no JSON columns), portable to PostgreSQL/MySQL
- **Repositories**: Factory functions (`createXxxRepo(db)`) encapsulate all SQL and handle snake_case/camelCase mapping
- **Scheduler**: Pure function with no database coupling - receives pre-fetched arrays from route handlers
- **Holiday Service**: Wraps the `date-holidays` npm package for offline public holiday data (no API keys needed)
- **Seeding**: Automatic on first run when the workers table is empty; also seeds default country (Finland) and public holidays

### Frontend

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with a clinical teal/cyan theme
- **API Client**: Custom hooks wrapping fetch calls

### Database Schema

```
workers                    - Staff members with roles and employment dates
weekly_availability        - Per-worker shift availability (composite PK, upsert-friendly)
monthly_schedules          - Generated schedule headers (year/month composite PK)
shift_assignments          - Individual shift assignments (FK to schedules and workers)
shift_configurations       - Named shift configs (one active at a time)
shift_type_definitions     - Shift types per config (day/evening/night with times)
daily_shift_requirements   - Required positions per day-of-week per shift type
settings                   - Key-value organization settings (country, region)
holidays                   - Public and custom holidays per country (composite PK: date+country)
```

All child tables use `ON DELETE CASCADE`. Booleans stored as INTEGER 0/1.

## User Guide

### Personnel Management Tab
- **List view** showing all personnel active in the selected month
- Columns: Name, Role, Type, Start Date, End Date, Flags, Actions
- Filter by role (Senior Specialist, Resident, Student) or type (Permanent, External)
- Workers only appear in months where their employment dates overlap
- Click **Avail** to set availability, **Edit** to modify details, **Del** to deactivate

### Availability Calendar
- Monthly calendar view (not weekly)
- Click any day to cycle: Default -> Preferred -> Unavailable -> Default
- Navigate months with arrow buttons
- Changes save automatically

### Schedule Tab
Three view modes:
1. **Calendar**: Monday-first weekly grid with daily shift assignments. Shift labels and times are read from the active configuration. Holiday dates highlighted in rose/red with holiday name badge. Weekend dates highlighted in amber.
2. **Stats**: Workload distribution per worker
3. **Lists**: Printable table with days as rows, positions as columns (Supervisor, 1st, 2nd, 3rd, Night). Holiday rows marked with "H" indicator and rose background.

### Configuration Tab

**Region & Holidays Section** (top of tab):
- Country dropdown (100+ countries from `date-holidays`)
- Optional state/region dropdown (for countries with regional holidays)
- Save Country button triggers re-population of public holidays for current + next year
- Holiday list for selected year with date, name, and type badge (public/custom)
- Year navigation arrows to browse holidays across years
- Add Custom Holiday form (date picker + name input)
- Delete button on each holiday row

**Shift Types Section:**
- Cards for each shift type (Day, Evening, Night)
- Editable start/end times in edit mode
- Shows "Crosses midnight" indicator for night shift

**Daily Requirements Matrix:**
- Table with days as rows
- Columns grouped by shift type, sub-columns for each position
- Toggle buttons to enable/disable positions per day/shift
- Visual indicators for required (+) vs not required (-)

- Save/Cancel buttons in edit mode
- Last updated timestamp

## API Endpoints

```
# Configuration
GET    /api/config                          - Get active shift configuration
GET    /api/config/all                      - Get all configurations
PUT    /api/config/:id                      - Update configuration
PUT    /api/config/:id/activate             - Set configuration as active

# Countries & Settings
GET    /api/config/countries                - List supported countries (from date-holidays)
GET    /api/config/countries/:code/states   - List states/regions for a country
GET    /api/config/settings                 - Get all settings (country, region)
PUT    /api/config/settings                 - Update settings; triggers holiday re-population

# Holidays
GET    /api/config/holidays/:year           - Get holidays for a year
POST   /api/config/holidays                 - Add custom holiday {date, name}
DELETE /api/config/holidays/:date           - Remove a holiday

# Workers
GET    /api/workers                         - List all workers
GET    /api/workers/:id                     - Get single worker
POST   /api/workers                         - Create worker
PUT    /api/workers/:id                     - Update worker
DELETE /api/workers/:id                     - Deactivate worker (soft delete)

# Availability
GET    /api/availability                    - List all availability entries
GET    /api/availability/worker/:id         - Get worker's availability
GET    /api/availability/week/:year/:week   - Get availability for a week
POST   /api/availability                    - Set availability entry
POST   /api/availability/batch              - Batch update availability
DELETE /api/availability                    - Delete availability entry

# Schedules
GET    /api/schedules                       - List all schedules
GET    /api/schedules/:year/:month          - Get specific month's schedule
POST   /api/schedules/generate              - Generate monthly schedule
PUT    /api/schedules/:year/:month/assignment/:id - Update assignment
DELETE /api/schedules/:year/:month          - Delete month's schedule

# Utilities
GET    /api/calendar/weeks/:year            - Get week date ranges for year
GET    /api/health                          - Health check
```

## File Structure

```
/backend
  /data
    oncall.db                  - SQLite database file (gitignored)
  /src
    /data
      initialData.ts           - Seed data (39 workers + default config)
    /db
      connection.ts            - DB connection, schema creation (9 tables), WAL + FK pragmas
      seed.ts                  - Conditional seeding: workers, config, settings, holidays
    /repositories
      workerRepo.ts            - Worker CRUD operations
      availabilityRepo.ts      - Availability upsert/query operations
      scheduleRepo.ts          - Schedule save/query with transactional writes
      configRepo.ts            - Config CRUD with child table management
      holidayRepo.ts           - Holiday CRUD, replacePublicHolidays transaction
      settingsRepo.ts          - Key-value settings get/set/getAll
    /routes
      workers.ts               - Worker endpoints
      availability.ts          - Availability endpoints
      schedules.ts             - Schedule generation and management endpoints
      config.ts                - Configuration, countries, settings, and holiday endpoints
    /services
      scheduler.ts             - Scheduling algorithm (pure function, holiday-aware)
      holidayService.ts        - Wraps date-holidays: country list, holiday fetching, population
    /types
      index.ts                 - All TypeScript interfaces and types
    index.ts                   - Express app, DB init, repository wiring, routes

/frontend
  /src
    /components
      WorkersTab.tsx           - Personnel list view
      WorkerForm.tsx           - Add/edit worker modal
      AvailabilityEditor.tsx   - Monthly calendar modal
      ScheduleTab.tsx          - Calendar (Mon-first), stats, and lists views with holiday highlighting
      ConfigurationTab.tsx     - Shift config editor + region & holidays management
    /hooks
      useApi.ts                - API client hooks (includes holiday/settings/country hooks)
    /types
      index.ts                 - TypeScript interfaces (includes Holiday)
    /utils
      helpers.ts               - Constants and formatting
    App.tsx                    - Main app with tabs
    main.tsx                   - React entry point
```
