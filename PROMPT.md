# OnCall - Hospital Shift Management System

## Project Description

Build a complete full-stack semi-automated shift scheduling system for a hospital internal medicine clinic. The system assigns workers to shifts based on their roles, availability preferences, and balances workload fairly.

## Personnel Structure

The clinic has the following staff categories:

1. **Senior Clinical Specialists** (15 total) - Work as supervisors only
2. **Residents** (10 permanent + 1 external = 11 total) - Can work 1st line or 2nd line positions
3. **Medical Students** (10 permanent + 3 external = 13 total) - Can work 2nd line or 3rd line positions only
   - Students are in years 4, 5, or 6 of medical school
4. **External workers** - Both residents and students can be external (on-demand). Externals can optionally work double shifts (evening + night consecutively)

## Line Hierarchy

- **Supervisor**: Senior specialists only
- **1st Line**: Residents only
- **2nd Line**: Residents or students
- **3rd Line**: Residents or students

## Shift Schedule

### Weekdays (Monday-Friday)

**Evening Shift (15:00-22:00):**
- 1 Supervisor (senior specialist)
- 1 First-line worker (resident)
- 1 Second-line worker (resident or student)
- On **Mondays and Fridays only**: 1 Third-line worker (resident or student)

**Night Shift (22:00-08:00):**
- 1 First-line worker (resident only)

### Weekends (Saturday-Sunday)

Senior specialists work 24-hour supervisor shifts (08:00-08:00), but the other positions rotate:

**Day Shift (08:00-15:00):**
- 1 First-line worker (resident)
- 1 Second-line worker (resident or student)

**Evening Shift (15:00-22:00):**
- 1 First-line worker (resident)
- 1 Second-line worker (resident or student)

**Night Shift (22:00-08:00):**
- 1 First-line worker (resident only)

## Availability System

- Workers set availability on a **weekly basis** (52 calendar weeks per year)
- For each day/shift combination, workers can mark:
  - **Available** (default) - Can be assigned, used for balancing
  - **Preferred** - Worker wants this shift, prioritize assigning
  - **Unavailable** - Worker cannot/will not work, avoid assigning
- Schedule generation is done **one month at a time**

## Scheduling Algorithm Requirements

1. Respect role constraints (who can fill which line position)
2. Prioritize workers who marked shifts as "preferred"
3. Avoid assigning workers to "unavailable" shifts
4. Balance workload evenly among workers of the same role
5. Permanent staff slightly preferred over external
6. External workers with double-shift capability can be assigned evening + night on the same day
7. Regular workers should not work multiple shifts on the same day

## Initial Data

Pre-populate the system with:
- 15 Senior Specialists (permanent)
- 10 Residents (permanent)
- 1 External Resident (can double-shift)
- 10 Students (permanent, mix of years 4, 5, 6)
- 3 External Students (can double-shift)

Use Italian names for realism. Start calendar from **January 1, 2026**.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Data**: In-memory storage (no database)
- **API**: REST JSON
- **Package Manager**: npm only
- **Runtime**: Node.js 18+

## User Interface Requirements

### Layout
- Tabbed interface with two main sections:
  1. **Personnel Management Tab**: List, add, edit, remove workers; set availability
  2. **Monthly Schedule Tab**: View/generate schedule for selected month

### Header
- Month/year selector dropdowns
- App branding

### Personnel Tab Features
- Filter by role (senior specialist, resident, student)
- Filter by type (permanent, external)
- Stats cards showing counts per category
- Worker cards with: name, role, year (for students), external badge, double-shift badge
- Actions: Edit, Remove, Set Availability
- Availability editor: weekly grid (7 days x shifts), click to cycle status, double-click to apply to all 52 weeks

### Schedule Tab Features
- Calendar view showing all days of the month
- Each day shows shifts with assigned workers by position
- Color-coded by shift type and position
- Click any assignment to swap to different eligible worker
- "Stats" view showing workload distribution per worker
- Generate/Regenerate schedule button

## Design Requirements

Create a distinctive, professional aesthetic:
- **No gradients**
- **No purple tints**
- Clean, clinical feel appropriate for healthcare
- Unique typography (suggest: DM Sans for UI, JetBrains Mono for data)
- Color scheme: teal/cyan accents (#0fb897 range) on neutral gray/white
- Sharp shadows instead of soft (e.g., `4px 4px 0px rgba(0,0,0,0.1)`)
- Subtle dot-grid background pattern
- Crisp borders (2px solid)
- Uppercase labels with letter-spacing for section headers

## API Endpoints

```
GET    /api/workers                    - List all workers
POST   /api/workers                    - Create worker
PUT    /api/workers/:id                - Update worker
DELETE /api/workers/:id                - Soft delete (deactivate)

GET    /api/availability               - List all availability entries
GET    /api/availability/worker/:id    - Get worker's availability
POST   /api/availability               - Set single availability entry
POST   /api/availability/batch         - Batch update availability

GET    /api/schedules                  - List all generated schedules
GET    /api/schedules/:year/:month     - Get specific month's schedule
POST   /api/schedules/generate         - Generate schedule for month
PUT    /api/schedules/:year/:month/assignment/:id - Update single assignment

GET    /api/calendar/weeks/:year       - Get week date ranges for year
GET    /api/health                     - Health check
```

## Data Models

```typescript
type WorkerRole = 'senior_specialist' | 'resident' | 'student';
type WorkerType = 'permanent' | 'external';
type ShiftType = 'day' | 'evening' | 'night';
type LinePosition = 'supervisor' | 'first_line' | 'second_line' | 'third_line';
type AvailabilityStatus = 'available' | 'preferred' | 'unavailable';

interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  type: WorkerType;
  canDoubleSift: boolean;
  yearOfStudy?: number; // 4, 5, or 6 for students
  active: boolean;
  createdAt: string;
}

interface WeeklyAvailability {
  workerId: string;
  year: number;
  week: number; // 1-52
  day: number; // 0=Sunday through 6=Saturday
  shiftType: ShiftType;
  status: AvailabilityStatus;
}

interface ShiftAssignment {
  id: string;
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
  position: LinePosition;
  workerId: string;
  isDoubleShift: boolean;
}

interface MonthlySchedule {
  year: number;
  month: number; // 1-12
  assignments: ShiftAssignment[];
  generatedAt: string;
}
```

## Deliverables

1. Complete working backend with all endpoints
2. Complete working frontend with all features
3. TypeScript throughout (strict mode)
4. All dependencies installable via `npm install`
5. Application runnable with `npm run dev` in both directories
6. README.md with setup instructions and 30-second demo script

Build the entire application in one pass, fully operational without additional modifications needed.
