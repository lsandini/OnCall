# OnCall — Hospital On-Call Scheduling

A shift scheduling system for hospital clinics. Manages on-call rosters across multiple specialties with semi-automated schedule generation, availability preferences, and holiday-aware planning.

Built for Finnish university hospitals but configurable for any country and clinic structure.

## Features

- **Multi-clinic support**: Manage separate specialties (Internal Medicine, Surgery, Cardiology, etc.) with independent staff, configurations, and schedules
- **Bilingual UI**: Full Finnish and English interface with locale-aware date formatting
- **Configurable shifts**: Define shift types, times, and daily position requirements per clinic
- **Personnel management**: Track senior specialists, residents, and medical students with employment dates and roles
- **Availability calendar**: Workers mark preferred/unavailable days per shift type
- **Auto-scheduling**: Generates balanced monthly rosters respecting preferences, employment dates, role constraints, and holidays
- **Manual override**: Click any assignment to reassign workers
- **Holiday-aware**: Country-specific public holidays (offline, 100+ countries via `date-holidays`) treated as Sundays for scheduling
- **Printable schedules**: Distribution list view optimized for print
- **Clinic administration**: Create, rename, and delete specialties from a dedicated admin panel
- **Persistent storage**: SQLite database survives restarts — no setup required

## Quick Start

```bash
# Backend (auto-creates and seeds database on first run)
cd backend && npm install && npm run dev

# Frontend (in another terminal)
cd frontend && npm install && npm run dev
```

Open http://localhost:5173

The database seeds with two clinics (Internal Medicine with 28 staff, Surgery with 22 staff), default shift configurations, and Finnish public holidays.

To reset: `rm backend/data/oncall.db` and restart.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, better-sqlite3 (WAL mode)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Database**: SQLite — 10 normalized tables, composite PKs, cascading deletes

## Default Shift Structure

The shift structure is fully configurable per clinic. The default configuration:

**Weekdays (Mon–Fri)**
- Evening (15:00–22:00): Supervisor + 1st Line + 2nd Line (+ 3rd Line on Mon/Fri)
- Night (22:00–08:00): 1st Line only (Supervisor continues from evening)

**Weekends & Public Holidays (Sat–Sun)**
- Day (09:00–22:00): Supervisor + 1st Line + 2nd Line
- Night: 1st Line only (Supervisor continues)

## Domain Model

| Role | Can fill |
|------|----------|
| Senior Specialist | Supervisor |
| Resident | 1st / 2nd / 3rd line |
| Medical Student | 2nd / 3rd line |

- **Shift types**: Day (weekends), Evening (weekdays), Night
- **Worker types**: Permanent staff, External (can do evening+night double shifts)
- **Availability**: Available (default), Preferred, Unavailable

## Application Tabs

- **Personnel**: List, filter, add/edit workers. Set availability via monthly calendar. Workers only appear in months where their employment dates overlap.
- **Schedule**: Three views — calendar grid (Mon-first weeks), workload stats, and printable distribution lists. Generate, fill gaps, or manually reassign.
- **Configuration** (admin mode): Edit shift types and times, configure daily position requirements, manage country/region settings and holidays.
- **Administration** (admin mode): Create new clinic specialties from a curated list, rename or delete existing clinics. Shows per-clinic stats.

Configuration and Administration tabs are revealed via a toggle button in the header.

## Database Schema

```
clinics                  - Clinic specialties (Internal Medicine, Surgery, etc.)
workers                  - Staff with roles, employment dates, clinic assignment
weekly_availability      - Per-worker shift preferences by week/day
monthly_schedules        - Generated schedule headers (clinic + year/month)
shift_assignments        - Individual shift assignments linked to schedules
shift_configurations     - Named shift configs per clinic (one active at a time)
shift_type_definitions   - Shift types per config (day/evening/night with times)
daily_shift_requirements - Required positions per day-of-week per shift type
settings                 - Key-value store (country, region, language)
holidays                 - Public and custom holidays per country
```

## API

All endpoints under `/api/`. Main route groups:

- `/api/clinics` — Clinic CRUD, stats, safe delete
- `/api/workers` — Personnel management (scoped by clinic)
- `/api/availability` — Worker shift preferences with validation
- `/api/schedules` — Generation, gap-filling, manual edits (scoped by clinic)
- `/api/config` — Shift configuration, country/holidays, language settings
