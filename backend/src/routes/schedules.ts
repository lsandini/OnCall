import { Router, Request, Response } from 'express';
import { generateMonthlySchedule } from '../services/scheduler.js';
import { WorkerRepo } from '../repositories/workerRepo.js';
import { AvailabilityRepo } from '../repositories/availabilityRepo.js';
import { ScheduleRepo } from '../repositories/scheduleRepo.js';
import { ConfigRepo } from '../repositories/configRepo.js';

export function createSchedulesRouter(
  workerRepo: WorkerRepo,
  availabilityRepo: AvailabilityRepo,
  scheduleRepo: ScheduleRepo,
  configRepo: ConfigRepo
) {
  const router = Router();

  // GET all schedules
  router.get('/', (_req: Request, res: Response) => {
    res.json(scheduleRepo.getAll());
  });

  // GET schedule for specific month
  router.get('/:year/:month', (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
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

    const newSchedule = generateMonthlySchedule(
      year,
      month,
      workers,
      availability,
      existingSchedules,
      configuration
    );

    scheduleRepo.save(newSchedule);
    res.json(newSchedule);
  });

  // PUT update single assignment
  router.put('/:year/:month/assignment/:assignmentId', (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const assignmentId = req.params.assignmentId;
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
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    scheduleRepo.deleteByMonth(year, month);
    res.status(204).send();
  });

  return router;
}
