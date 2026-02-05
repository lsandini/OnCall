# OnCall - Hospital Shift Management System

## Project Description

A full-stack semi-automated shift scheduling system for hospital clinics. The system assigns workers to shifts based on their roles, availability preferences, employment dates, and balances workload fairly. All data is persisted in a local SQLite database.

**Key features**:
- **Configurable shift structure** per clinic (one-time setup)
- **Employment duration tracking** - workers have start/end dates
- **Monthly calendar availability** - intuitive day-by-day availability setting
- **Distribution lists** - printable monthly schedule tables
- **Personnel filtered by month** - only show workers employed in selected month
- **Persistent storage** - SQLite database survives server restarts

## Personnel Structure

The clinic has the following staff categories:

1. **Senior Clinical Specialists** (15 total) - Work as supervisors only
2. **Residents** (10 permanent + 1 external = 11 total) - Can work 1st line or 2nd line positions
3. **Medical Students** (10 permanent + 3 external = 13 total) - Can work 2nd line or 3rd line positions only
   - Students are in years 4, 5, or 6 of medical school
4. **External workers** - Both residents and students can be external (on-demand). Externals can optionally work double shifts (evening + night consecutively)

### Employment Duration

Each worker can have:
- **Start Date**: When they begin working (optional, defaults to always employed)
- **End Date**: When they stop working (optional, defaults to ongoing employment)

Workers only appear in the personnel list for months where their employment overlaps. The scheduler also respects these dates.

## Line Hierarchy

- **Supervisor**: Senior specialists only
- **1st Line**: Residents only
- **2nd Line**: Residents or students
- **3rd Line**: Residents or students

## Shift Configuration (One-Time Setup)

Administrators configure the clinic's shift structure via a Configuration tab. This defines:

1. **Shift Types**: Define shift names and time ranges
   - Day: 09:00-22:00 (weekends)
   - Evening: 15:00-22:00 (weekdays)
   - Night: 22:00-08:00 (crosses midnight)

2. **Daily Requirements**: For each day of the week, specify which shifts run and what positions are needed

3. **Position Matrix**: Visual grid showing day vs shift type vs positions required

### Default Configuration: Internal Medicine

**Supervisor On-Call Schedule:**
| Day | On-Call Period |
|-----|----------------|
| Monday-Thursday | 15:00 to 08:00 next day |
| Friday | 15:00 to 09:00 Saturday |
| Saturday | 09:00 to 09:00 Sunday (24h) |
| Sunday | 09:00 to 08:00 Monday |

**Weekdays (Monday-Friday):**
- Evening Shift (15:00-22:00): Supervisor + 1st Line + 2nd Line
  - Mondays and Fridays: Add 3rd Line
- Night Shift (22:00-08:00): 1st Line only (Supervisor continues)

**Weekends (Saturday-Sunday):**
- Day Shift (09:00-22:00): Supervisor + 1st Line + 2nd Line
- Night Shift: 1st Line only (Supervisor continues)

## Availability System

- Workers set availability via a **monthly calendar view**
- Click any day to cycle through statuses:
  - **Default** (white) - Available, used for balancing
  - **Preferred** (green) - Worker wants this day, prioritize assigning
  - **Unavailable** (red) - Worker cannot work, avoid assigning
- Navigate between months with arrow buttons
- Changes save automatically
- Availability applies to all relevant shifts for that worker's role on that day

## Scheduling Algorithm Requirements

1. Respect role constraints (who can fill which line position)
2. Check worker employment dates - only assign if employed on that date
3. Prioritize workers who marked days as "preferred"
4. Avoid assigning workers to "unavailable" days
5. Balance workload evenly among workers of the same role
6. Permanent staff slightly preferred over external
7. External workers with double-shift capability can be assigned evening + night on same day
8. Regular workers should not work multiple shifts on the same day

## Initial Data

Pre-populate the system with (seeded on first run when database is empty):
- 15 Senior Specialists (permanent)
- 10 Residents (permanent)
- 1 External Resident (can double-shift)
- 10 Students (permanent, mix of years 4, 5, 6)
- 3 External Students (can double-shift)
- Default Internal Medicine shift configuration

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite via `better-sqlite3` (WAL mode, foreign keys enabled)
- **API**: REST JSON
- **Package Manager**: npm only
- **Runtime**: Node.js 18+

## User Interface Requirements

### Layout
- Tabbed interface with three main sections:
  1. **Personnel Management Tab**: List workers, set availability, manage employment dates
  2. **Monthly Schedule Tab**: View/generate schedule, distribution lists
  3. **Configuration Tab**: One-time setup of shift structure

### Header
- Month/year selector dropdowns (affects personnel filtering and schedule view)
- App branding

### Personnel Management Tab

**List View** (not cards/tiles):
- Table with columns: Name, Role, Type, Start Date, End Date, Flags, Actions
- Only show workers whose employment dates overlap with selected month
- Filter dropdowns for role and type
- Stats summary showing count per role

**Actions per worker:**
- **Avail**: Open availability calendar
- **Edit**: Modify worker details including employment dates
- **Del**: Deactivate worker (soft delete)

**Add Personnel button** opens form with:
- Name, Role, Type, Year of Study (for students)
- Can Double Shift checkbox (for externals)
- Start Date and End Date fields

### Availability Calendar (Modal)

- Monthly calendar grid (7 columns for Mon-Sun)
- Shows actual dates for the month
- Navigate months with arrow buttons
- Click day to cycle: Default -> Preferred -> Unavailable -> Default
- Color legend at top
- Changes save automatically
- Compact design

### Schedule Tab

**Three view modes** (toggle buttons):

1. **Calendar View**:
   - Grid showing all days of the month
   - Each day shows shifts with assigned workers by position
   - Color-coded by shift type
   - Click any assignment to swap to different eligible worker
   - Weekend days highlighted

2. **Stats View**:
   - Table showing workload distribution
   - Columns: Name, Role, Shift Count
   - Sorted by shift count descending

3. **Lists View** (Distribution Lists):
   - Single table with days as rows
   - Columns: Date, Supervisor, 1st Line, 2nd Line, 3rd Line, Night
   - Shows last names only for compactness
   - External staff marked with asterisk (*)
   - Weekend rows highlighted
   - Print button for distribution

**Generate/Regenerate button** creates schedule using configuration and respecting availability.

### Configuration Tab

- Display current configuration name and description
- Edit button to enter edit mode

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
GET    /api/config                     - Get active shift configuration
GET    /api/config/all                 - Get all configurations
PUT    /api/config/:id                 - Update configuration
PUT    /api/config/:id/activate        - Set configuration as active

# Workers
GET    /api/workers                    - List all workers
GET    /api/workers/:id                - Get single worker
POST   /api/workers                    - Create worker
PUT    /api/workers/:id                - Update worker
DELETE /api/workers/:id                - Soft delete (deactivate)

# Availability
GET    /api/availability               - List all availability entries
GET    /api/availability/worker/:id    - Get worker's availability
GET    /api/availability/week/:year/:week - Get availability for a week
POST   /api/availability               - Set single availability entry
POST   /api/availability/batch         - Batch update availability
DELETE /api/availability               - Delete availability entry

# Schedules
GET    /api/schedules                  - List all generated schedules
GET    /api/schedules/:year/:month     - Get specific month's schedule
POST   /api/schedules/generate         - Generate schedule for month
PUT    /api/schedules/:year/:month/assignment/:id - Update single assignment
DELETE /api/schedules/:year/:month     - Delete month's schedule

# Utilities
GET    /api/calendar/weeks/:year       - Get week date ranges for year
GET    /api/health                     - Health check
```

## Database Schema

SQLite with fully normalized tables (no JSON columns). Portable to PostgreSQL/MySQL.

```sql
workers (id, name, role, type, can_double_shift, year_of_study, start_date, end_date, active, created_at)
weekly_availability (worker_id, year, week, day, shift_type, status)              -- composite PK
monthly_schedules (year, month, generated_at)                                     -- composite PK
shift_assignments (id, schedule_year, schedule_month, date, shift_type, position, worker_id, is_double_shift)
shift_configurations (id, name, description, created_at, updated_at, is_active)
shift_type_definitions (config_id, id, name, start_time, end_time, crosses_midnight)
daily_shift_requirements (id AUTOINCREMENT, config_id, day_of_week, shift_type_id, positions)
```

- Foreign keys with `ON DELETE CASCADE` on all child tables
- `INSERT OR REPLACE` for availability upserts (leverages composite PK)
- Booleans stored as INTEGER 0/1 (SQLite convention)
- WAL journal mode for concurrent read performance

## Data Models

```typescript
// === Types ===
type WorkerRole = 'senior_specialist' | 'resident' | 'student';
type WorkerType = 'permanent' | 'external';
type ShiftType = 'day' | 'evening' | 'night';
type LinePosition = 'supervisor' | 'first_line' | 'second_line' | 'third_line';
type AvailabilityStatus = 'available' | 'preferred' | 'unavailable';

// === Shift Configuration ===
interface ShiftTypeDefinition {
  id: string;              // e.g., 'evening', 'night', 'day'
  name: string;            // Display name
  startTime: string;       // "15:00"
  endTime: string;         // "22:00"
  crossesMidnight: boolean;
}

interface DailyShiftRequirement {
  dayOfWeek: number;       // 0=Sunday ... 6=Saturday
  shiftTypeId: string;     // Reference to ShiftTypeDefinition.id
  positions: LinePosition[];
}

interface ShiftConfiguration {
  id: string;
  name: string;            // e.g., "Internal Medicine"
  description?: string;
  shiftTypes: ShiftTypeDefinition[];
  dailyRequirements: DailyShiftRequirement[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// === Worker ===
interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  type: WorkerType;
  canDoubleSift: boolean;  // For externals: can do evening + night
  yearOfStudy?: number;    // For students: 4, 5, or 6
  startDate?: string;      // Employment start date (YYYY-MM-DD)
  endDate?: string;        // Employment end date (YYYY-MM-DD)
  active: boolean;
  createdAt: string;
}

// === Availability ===
interface WeeklyAvailability {
  workerId: string;
  year: number;
  week: number;            // ISO week 1-52
  day: number;             // 0=Sunday through 6=Saturday
  shiftType: ShiftType;
  status: AvailabilityStatus;
}

// === Schedule ===
interface ShiftAssignment {
  id: string;
  date: string;            // YYYY-MM-DD
  shiftType: ShiftType;
  position: LinePosition;
  workerId: string;
  isDoubleShift: boolean;
}

interface MonthlySchedule {
  year: number;
  month: number;           // 1-12
  assignments: ShiftAssignment[];
  generatedAt: string;
}
```

## Design Requirements

Create a distinctive, professional aesthetic:
- **No gradients**
- **No purple tints**
- Clean, clinical feel appropriate for healthcare
- Color scheme: teal/cyan accents on neutral gray/white
- Sharp shadows instead of soft (e.g., `4px 4px 0px rgba(0,0,0,0.1)`)
- Crisp borders (2px solid)
- Uppercase labels with letter-spacing for section headers
- Compact, information-dense layouts
- Print-friendly distribution lists

## File Structure

```
/backend
  /data
    oncall.db                - SQLite database (gitignored)
  /src
    /data
      initialData.ts         - Default workers and configuration (used for seeding)
    /db
      connection.ts          - Open DB, create tables, WAL mode, foreign keys
      seed.ts                - Seed if workers table is empty
    /repositories
      workerRepo.ts          - Worker CRUD (getAll, getById, create, update, softDelete)
      availabilityRepo.ts    - Availability CRUD (getAll, getByWorker, getByWeek, upsert, batchUpsert, remove)
      scheduleRepo.ts        - Schedule CRUD (getAll, getByMonth, save, updateAssignment, deleteByMonth)
      configRepo.ts          - Config CRUD (getAll, getActive, create, update, activate)
    /routes
      workers.ts             - Worker CRUD endpoints
      availability.ts        - Availability endpoints
      schedules.ts           - Schedule generation and management
      config.ts              - Configuration endpoints
    /services
      scheduler.ts           - Schedule generation algorithm (pure function, no DB coupling)
    /types
      index.ts               - All TypeScript interfaces
    index.ts                 - Express app setup, DB init, repo wiring

/frontend
  /src
    /components
      WorkersTab.tsx         - Personnel list view
      WorkerForm.tsx         - Add/edit worker modal
      AvailabilityEditor.tsx - Monthly calendar modal
      ScheduleTab.tsx        - Calendar, stats, and lists views
      ConfigurationTab.tsx   - Shift configuration editor
    /hooks
      useApi.ts              - API client hooks
    /types
      index.ts               - TypeScript interfaces
    /utils
      helpers.ts             - Constants and formatting
    App.tsx                  - Main app with tabs
    main.tsx                 - React entry point
```

## Deliverables

1. Complete working backend with all endpoints
2. Complete working frontend with all features
3. TypeScript throughout (strict mode)
4. All dependencies installable via `npm install`
5. Application runnable with `npm run dev` in both directories
6. Persistent SQLite storage (auto-seeds on first run, persists across restarts)
7. README.md with setup instructions
