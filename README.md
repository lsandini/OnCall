# OnCall - Hospital Shift Management System

A semi-automated shift scheduling system for internal medicine clinics.

## Features

- **Personnel Management**: Track senior specialists, residents, and medical students
- **Availability Rules**: Workers can set preferred/unavailable times per week
- **Auto-Scheduling**: Balance workload while respecting preferences
- **Manual Override**: Click any assignment to swap workers
- **External Staff**: Support for on-demand workers with double-shift capability

## Shift Structure

### Weekdays (Mon-Fri)
- **Evening (15:00-22:00)**: Supervisor + 1st Line + 2nd Line (+ 3rd Line on Mon/Fri)
- **Night (22:00-08:00)**: 1st Line only

### Weekends (Sat-Sun)
- **Day (08:00-15:00)**: 1st Line + 2nd Line
- **Evening (15:00-22:00)**: 1st Line + 2nd Line
- **Night (22:00-08:00)**: 1st Line only

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

## 30-Second Demo Script

1. **Open app** → See pre-loaded 39 workers (15 supervisors, 11 residents, 13 students)

2. **Personnel tab** → Filter by "Residents" → Click "Availability" on first resident
   - Toggle Monday Evening to "Preferred" (green star)
   - Toggle Tuesday Night to "Unavailable" (red X)
   - Close modal

3. **Select "January 2026"** from header dropdowns

4. **Schedule tab** → Click "Generate Schedule"
   - Calendar populates with all shifts
   - Click any assignment box to swap workers
   - Check "Stats" view to see workload balance

5. **Back to Personnel** → Click "+ Add Personnel"
   - Add external resident → Enable "Double Shifts"
   - Re-generate schedule → External may get evening+night combos

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (custom clinical theme)
- Node.js + Express backend
- In-memory data (no database)
- REST JSON API

## API Endpoints

```
GET    /api/workers              - List all workers
POST   /api/workers              - Create worker
PUT    /api/workers/:id          - Update worker
DELETE /api/workers/:id          - Deactivate worker

GET    /api/availability         - List all availability
POST   /api/availability         - Set availability entry
POST   /api/availability/batch   - Batch update availability

GET    /api/schedules            - List all schedules
GET    /api/schedules/:year/:month - Get specific schedule
POST   /api/schedules/generate   - Generate monthly schedule
PUT    /api/schedules/:year/:month/assignment/:id - Update assignment
```
