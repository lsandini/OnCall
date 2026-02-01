import express from 'express';
import cors from 'cors';
import { Worker, WeeklyAvailability, MonthlySchedule, ShiftConfiguration } from './types/index.js';
import { createInitialWorkers, createInitialAvailability, createDefaultShiftConfiguration } from './data/initialData.js';
import { createWorkersRouter } from './routes/workers.js';
import { createAvailabilityRouter } from './routes/availability.js';
import { createSchedulesRouter } from './routes/schedules.js';
import { createConfigRouter } from './routes/config.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory data store
let workers: Worker[] = createInitialWorkers();
let availability: WeeklyAvailability[] = createInitialAvailability();
let schedules: MonthlySchedule[] = [];
let configurations: ShiftConfiguration[] = [createDefaultShiftConfiguration()];

// Data accessors
const getWorkers = () => workers;
const setWorkers = (w: Worker[]) => { workers = w; };
const getAvailability = () => availability;
const setAvailability = (a: WeeklyAvailability[]) => { availability = a; };
const getSchedules = () => schedules;
const setSchedules = (s: MonthlySchedule[]) => { schedules = s; };
const getConfigurations = () => configurations;
const setConfigurations = (c: ShiftConfiguration[]) => { configurations = c; };
const getActiveConfiguration = () => configurations.find(c => c.isActive);

// Routes
app.use('/api/workers', createWorkersRouter(getWorkers, setWorkers));
app.use('/api/availability', createAvailabilityRouter(getAvailability, setAvailability));
app.use('/api/schedules', createSchedulesRouter(getWorkers, getAvailability, getSchedules, setSchedules, getActiveConfiguration));
app.use('/api/config', createConfigRouter(getConfigurations, setConfigurations));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', workers: workers.length, schedules: schedules.length });
});

// Calendar helper - get weeks in a year
app.get('/api/calendar/weeks/:year', (req, res) => {
  const year = parseInt(req.params.year);
  const weeks: { week: number; startDate: string; endDate: string }[] = [];

  // Get first Monday of the year
  const firstDay = new Date(year, 0, 1);
  const firstMonday = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  const diff = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
  firstMonday.setDate(firstDay.getDate() + diff);

  // Generate all weeks
  for (let week = 1; week <= 52; week++) {
    const startDate = new Date(firstMonday);
    startDate.setDate(firstMonday.getDate() + (week - 1) * 7);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    weeks.push({
      week,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  }

  res.json(weeks);
});

// Start server
app.listen(PORT, () => {
  console.log(`OnCall API running on port ${PORT}`);
  console.log(`Loaded ${workers.length} workers`);
});
