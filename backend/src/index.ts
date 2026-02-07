import express from 'express';
import cors from 'cors';
import { openDatabase } from './db/connection.js';
import { seedIfEmpty } from './db/seed.js';
import { createWorkerRepo } from './repositories/workerRepo.js';
import { createAvailabilityRepo } from './repositories/availabilityRepo.js';
import { createScheduleRepo } from './repositories/scheduleRepo.js';
import { createConfigRepo } from './repositories/configRepo.js';
import { createHolidayRepo } from './repositories/holidayRepo.js';
import { createSettingsRepo } from './repositories/settingsRepo.js';
import { createClinicRepo } from './repositories/clinicRepo.js';
import { createWorkersRouter } from './routes/workers.js';
import { createAvailabilityRouter } from './routes/availability.js';
import { createSchedulesRouter } from './routes/schedules.js';
import { createConfigRouter } from './routes/config.js';
import { createClinicsRouter } from './routes/clinics.js';

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
const holidayRepo = createHolidayRepo(db);
const settingsRepo = createSettingsRepo(db);
const clinicRepo = createClinicRepo(db);

// Routes
app.use('/api/clinics', createClinicsRouter(clinicRepo));
app.use('/api/workers', createWorkersRouter(workerRepo));
app.use('/api/availability', createAvailabilityRouter(availabilityRepo));
app.use('/api/schedules', createSchedulesRouter(workerRepo, availabilityRepo, scheduleRepo, configRepo, holidayRepo, settingsRepo));
app.use('/api/config', createConfigRouter(configRepo, holidayRepo, settingsRepo));

// Health check
app.get('/api/health', (_req, res) => {
  const clinics = clinicRepo.getAll();
  const totalWorkers = clinics.reduce((sum, c) => sum + workerRepo.count(c.id), 0);
  res.json({ status: 'ok', clinics: clinics.length, workers: totalWorkers });
});

// Calendar helper - get weeks in a year
app.get('/api/calendar/weeks/:year', (req, res) => {
  const year = parseInt(req.params.year);
  if (isNaN(year)) {
    return res.status(400).json({ error: 'Invalid year' });
  }
  const weeks: { week: number; startDate: string; endDate: string }[] = [];

  // Get first Monday of the year
  const firstDay = new Date(year, 0, 1);
  const firstMonday = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  const diff = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
  firstMonday.setDate(firstDay.getDate() + diff);

  // Calculate ISO week count: Dec 28 is always in the last ISO week of its year
  const dec28 = new Date(year, 11, 28);
  const dec28Day = dec28.getDay() || 7;
  const dec28Thu = new Date(dec28);
  dec28Thu.setDate(dec28.getDate() + (4 - dec28Day));
  const jan1 = new Date(dec28Thu.getFullYear(), 0, 1);
  const totalWeeks = Math.ceil((((dec28Thu.getTime() - jan1.getTime()) / 86400000) + 1) / 7);

  // Generate all weeks
  for (let week = 1; week <= totalWeeks; week++) {
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

// Global error handler — prevent raw stack traces leaking to clients
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
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
  const clinics = clinicRepo.getAll();
  console.log(`Loaded ${clinics.length} clinics: ${clinics.map(c => c.name).join(', ')}`);
});
