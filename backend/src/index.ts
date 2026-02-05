import express from 'express';
import cors from 'cors';
import { openDatabase } from './db/connection.js';
import { seedIfEmpty } from './db/seed.js';
import { createWorkerRepo } from './repositories/workerRepo.js';
import { createAvailabilityRepo } from './repositories/availabilityRepo.js';
import { createScheduleRepo } from './repositories/scheduleRepo.js';
import { createConfigRepo } from './repositories/configRepo.js';
import { createWorkersRouter } from './routes/workers.js';
import { createAvailabilityRouter } from './routes/availability.js';
import { createSchedulesRouter } from './routes/schedules.js';
import { createConfigRouter } from './routes/config.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database
const db = openDatabase();
seedIfEmpty(db);

// Repositories
const workerRepo = createWorkerRepo(db);
const availabilityRepo = createAvailabilityRepo(db);
const scheduleRepo = createScheduleRepo(db);
const configRepo = createConfigRepo(db);

// Routes
app.use('/api/workers', createWorkersRouter(workerRepo));
app.use('/api/availability', createAvailabilityRouter(availabilityRepo));
app.use('/api/schedules', createSchedulesRouter(workerRepo, availabilityRepo, scheduleRepo, configRepo));
app.use('/api/config', createConfigRouter(configRepo));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', workers: workerRepo.count(), schedules: scheduleRepo.getAll().length });
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

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`OnCall API running on port ${PORT}`);
  console.log(`Loaded ${workerRepo.count()} workers`);
});
