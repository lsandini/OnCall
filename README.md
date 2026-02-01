# OnCall - Hospital Shift Management System

A semi-automated shift scheduling system for hospital clinics.

## Features

- **Configurable Shift Structure**: Define shift types, times, and daily position requirements per clinic
- **Personnel Management**: Track senior specialists, residents, and medical students with employment dates
- **Employment Duration**: Set start/end dates for workers - they only appear in months where they're employed
- **Availability Calendar**: Monthly calendar view to mark preferred/unavailable days
- **Auto-Scheduling**: Balance workload while respecting preferences and employment dates
- **Manual Override**: Click any assignment to swap workers
- **Distribution Lists**: Printable monthly schedule table for distribution
- **External Staff**: Support for on-demand workers with double-shift capability

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

### Weekends (Sat-Sun)
- **Day (09:00-22:00)**: Supervisor + 1st Line + 2nd Line
- **Night**: 1st Line only (Supervisor continues)

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

## User Guide

### Personnel Management Tab
- **List view** showing all personnel active in the selected month
- Columns: Name, Role, Type, Start Date, End Date, Flags, Actions
- Filter by role (Senior Specialist, Resident, Student) or type (Permanent, External)
- Workers only appear in months where their employment dates overlap
- Click **Avail** to set availability, **Edit** to modify details, **Del** to deactivate

### Availability Calendar
- Monthly calendar view (not weekly)
- Click any day to cycle: Default → Preferred → Unavailable → Default
- Navigate months with arrow buttons
- Changes save automatically

### Schedule Tab
Three view modes:
1. **Calendar**: Visual calendar with daily shift assignments
2. **Stats**: Workload distribution per worker
3. **Lists**: Printable table with days as rows, positions as columns (Supervisor, 1st, 2nd, 3rd, Night)

### Configuration Tab
- Edit shift types (name, start/end times)
- Toggle positions required per day of week
- Matrix grid showing which positions are needed for each day/shift combination

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (custom clinical theme)
- Node.js + Express backend
- In-memory data (no database)
- REST JSON API

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
DELETE /api/workers/:id                - Deactivate worker (soft delete)

# Availability
GET    /api/availability               - List all availability entries
GET    /api/availability/worker/:id    - Get worker's availability
GET    /api/availability/week/:year/:week - Get availability for a week
POST   /api/availability               - Set availability entry
POST   /api/availability/batch         - Batch update availability
DELETE /api/availability               - Delete availability entry

# Schedules
GET    /api/schedules                  - List all schedules
GET    /api/schedules/:year/:month     - Get specific month's schedule
POST   /api/schedules/generate         - Generate monthly schedule
PUT    /api/schedules/:year/:month/assignment/:id - Update assignment
DELETE /api/schedules/:year/:month     - Delete month's schedule

# Utilities
GET    /api/calendar/weeks/:year       - Get week date ranges for year
GET    /api/health                     - Health check
```

## Data Models

```typescript
interface Worker {
  id: string;
  name: string;
  role: 'senior_specialist' | 'resident' | 'student';
  type: 'permanent' | 'external';
  canDoubleSift: boolean;
  yearOfStudy?: number;      // For students: 4, 5, or 6
  startDate?: string;        // Employment start (YYYY-MM-DD)
  endDate?: string;          // Employment end (YYYY-MM-DD)
  active: boolean;
  createdAt: string;
}

interface ShiftConfiguration {
  id: string;
  name: string;
  description?: string;
  shiftTypes: ShiftTypeDefinition[];
  dailyRequirements: DailyShiftRequirement[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface ShiftTypeDefinition {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
}

interface DailyShiftRequirement {
  dayOfWeek: number;         // 0=Sunday ... 6=Saturday
  shiftTypeId: string;
  positions: LinePosition[];
}
```

## 30-Second Demo

1. **Open app** → Pre-loaded with 39 workers and Internal Medicine configuration
2. **Personnel tab** → Note the list view with Start/End date columns
3. **Click Availability** on any worker → Monthly calendar appears
4. **Mark Jan 1 as Unavailable** (click to cycle to red)
5. **Schedule tab** → Click "Generate Schedule"
6. **Click "Lists"** → See printable distribution table
7. **Configuration tab** → View/edit shift structure
