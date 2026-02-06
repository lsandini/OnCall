import { Router, Request, Response } from 'express';
import { generateMonthlySchedule, fillScheduleGaps } from '../services/scheduler.js';
import { WorkerRepo } from '../repositories/workerRepo.js';
import { AvailabilityRepo } from '../repositories/availabilityRepo.js';
import { ScheduleRepo } from '../repositories/scheduleRepo.js';
import { ConfigRepo } from '../repositories/configRepo.js';
import { HolidayRepo } from '../repositories/holidayRepo.js';
import { SettingsRepo } from '../repositories/settingsRepo.js';

export function createSchedulesRouter(
  workerRepo: WorkerRepo,
  availabilityRepo: AvailabilityRepo,
  scheduleRepo: ScheduleRepo,
  configRepo: ConfigRepo,
  holidayRepo: HolidayRepo,
  settingsRepo: SettingsRepo
) {
  const router = Router();

  // GET all schedules
  router.get('/', (_req: Request, res: Response) => {
    res.json(scheduleRepo.getAll());
  });

  // GET schedule for specific month
  router.get('/:year/:month', (req: Request, res: Response) => {
    const year = parseInt(req.params.year as string);
    const month = parseInt(req.params.month as string);
    const schedule = scheduleRepo.getByMonth(year, month);

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json(schedule);
  });

  // POST generate schedule for a month
  router.post('/generate', (req: Request, res: Response) => {
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    // Pre-fetch arrays for the scheduler (pure function)
    const workers = workerRepo.getAll();
    const availability = availabilityRepo.getAll();
    const existingSchedules = scheduleRepo.getAll();
    const configuration = configRepo.getActive();

    // Fetch holidays for the target month
    const country = settingsRepo.get('country') || 'FI';
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    const holidays = holidayRepo.getByDateRange(firstDay, lastDay, country);

    const newSchedule = generateMonthlySchedule(
      year,
      month,
      workers,
      availability,
      existingSchedules,
      configuration,
      holidays
    );

    scheduleRepo.save(newSchedule);
    res.json(newSchedule);
  });

  // POST fill gaps in existing schedule
  router.post('/fill-gaps', (req: Request, res: Response) => {
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const existing = scheduleRepo.getByMonth(year, month);
    if (!existing) {
      return res.status(404).json({ error: 'No existing schedule found for this month' });
    }

    const workers = workerRepo.getAll();
    const availability = availabilityRepo.getAll();
    const configuration = configRepo.getActive();

    const country = settingsRepo.get('country') || 'FI';
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    const holidays = holidayRepo.getByDateRange(firstDay, lastDay, country);

    const updated = fillScheduleGaps(
      year,
      month,
      existing.assignments,
      workers,
      availability,
      configuration,
      holidays
    );

    scheduleRepo.save(updated);
    res.json(updated);
  });

  // PUT update single assignment
  router.put('/:year/:month/assignment/:assignmentId', (req: Request, res: Response) => {
    const year = parseInt(req.params.year as string);
    const month = parseInt(req.params.month as string);
    const assignmentId = req.params.assignmentId as string;
    const { workerId } = req.body;

    const schedule = scheduleRepo.getByMonth(year, month);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const updated = scheduleRepo.updateAssignment(assignmentId, workerId);
    if (!updated) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(updated);
  });

  // DELETE schedule for a month
  router.delete('/:year/:month', (req: Request, res: Response) => {
    const year = parseInt(req.params.year as string);
    const month = parseInt(req.params.month as string);
    scheduleRepo.deleteByMonth(year, month);
    res.status(204).send();
  });

  return router;
}
