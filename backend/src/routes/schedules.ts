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

  // GET all schedules for a clinic
  router.get('/', (req: Request, res: Response) => {
    const clinicId = req.query.clinicId as string;
    if (!clinicId) {
      return res.status(400).json({ error: 'clinicId query parameter is required' });
    }
    res.json(scheduleRepo.getAll(clinicId));
  });

  // GET schedule for specific month
  router.get('/:year/:month', (req: Request, res: Response) => {
    const clinicId = req.query.clinicId as string;
    if (!clinicId) {
      return res.status(400).json({ error: 'clinicId query parameter is required' });
    }
    const year = parseInt(req.params.year as string);
    const month = parseInt(req.params.month as string);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }
    const schedule = scheduleRepo.getByMonth(clinicId, year, month);

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json(schedule);
  });

  // POST generate schedule for a month
  router.post('/generate', (req: Request, res: Response) => {
    const { clinicId, year, month } = req.body;

    if (!clinicId || year == null || month == null) {
      return res.status(400).json({ error: 'clinicId, year and month are required' });
    }
    if (typeof year !== 'number' || typeof month !== 'number' || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    // Pre-fetch arrays for the scheduler (pure function)
    const workers = workerRepo.getAll(clinicId);
    const availability = availabilityRepo.getAll();
    const existingSchedules = scheduleRepo.getAll(clinicId);
    const configuration = configRepo.getActive(clinicId);

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

    scheduleRepo.save(clinicId, newSchedule);
    res.json(newSchedule);
  });

  // POST fill gaps in existing schedule
  router.post('/fill-gaps', (req: Request, res: Response) => {
    const { clinicId, year, month } = req.body;

    if (!clinicId || year == null || month == null) {
      return res.status(400).json({ error: 'clinicId, year and month are required' });
    }
    if (typeof year !== 'number' || typeof month !== 'number' || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    const existing = scheduleRepo.getByMonth(clinicId, year, month);
    if (!existing) {
      return res.status(404).json({ error: 'No existing schedule found for this month' });
    }

    const workers = workerRepo.getAll(clinicId);
    const availability = availabilityRepo.getAll();
    const configuration = configRepo.getActive(clinicId);

    const country = settingsRepo.get('country') || 'FI';
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    const holidays = holidayRepo.getByDateRange(firstDay, lastDay, country);

    // Get previous month's schedule for consecutive weekend check
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevSchedule = scheduleRepo.getByMonth(clinicId, prevYear, prevMonth);

    const updated = fillScheduleGaps(
      year,
      month,
      existing.assignments,
      workers,
      availability,
      configuration,
      holidays,
      prevSchedule?.assignments
    );

    scheduleRepo.save(clinicId, updated);
    res.json(updated);
  });

  // PUT update single assignment
  router.put('/:year/:month/assignment/:assignmentId', (req: Request, res: Response) => {
    const clinicId = req.query.clinicId as string;
    if (!clinicId) {
      return res.status(400).json({ error: 'clinicId query parameter is required' });
    }
    const year = parseInt(req.params.year as string);
    const month = parseInt(req.params.month as string);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }
    const assignmentId = req.params.assignmentId as string;
    const { workerId } = req.body;
    if (!workerId || typeof workerId !== 'string') {
      return res.status(400).json({ error: 'workerId is required' });
    }

    const schedule = scheduleRepo.getByMonth(clinicId, year, month);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Verify the assignment belongs to this clinic's schedule
    const assignmentBelongs = schedule.assignments.some(a => a.id === assignmentId);
    if (!assignmentBelongs) {
      return res.status(404).json({ error: 'Assignment not found in this schedule' });
    }

    const updated = scheduleRepo.updateAssignment(assignmentId, workerId);
    if (!updated) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(updated);
  });

  // DELETE schedule for a month
  router.delete('/:year/:month', (req: Request, res: Response) => {
    const clinicId = req.query.clinicId as string;
    if (!clinicId) {
      return res.status(400).json({ error: 'clinicId query parameter is required' });
    }
    const year = parseInt(req.params.year as string);
    const month = parseInt(req.params.month as string);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }
    const deleted = scheduleRepo.deleteByMonth(clinicId, year, month);
    if (!deleted) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.status(204).send();
  });

  return router;
}
