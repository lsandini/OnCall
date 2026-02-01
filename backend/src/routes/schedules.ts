import { Router, Request, Response } from 'express';
import { Worker, WeeklyAvailability, MonthlySchedule, ShiftConfiguration } from '../types/index.js';
import { generateMonthlySchedule } from '../services/scheduler.js';

export function createSchedulesRouter(
  getWorkers: () => Worker[],
  getAvailability: () => WeeklyAvailability[],
  getSchedules: () => MonthlySchedule[],
  setSchedules: (schedules: MonthlySchedule[]) => void,
  getActiveConfiguration: () => ShiftConfiguration | undefined
) {
  const router = Router();

  // GET all schedules
  router.get('/', (_req: Request, res: Response) => {
    res.json(getSchedules());
  });

  // GET schedule for specific month
  router.get('/:year/:month', (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const schedule = getSchedules().find(s => s.year === year && s.month === month);

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

    const workers = getWorkers();
    const availability = getAvailability();
    const schedules = getSchedules();
    const configuration = getActiveConfiguration();

    const newSchedule = generateMonthlySchedule(
      year,
      month,
      workers,
      availability,
      schedules,
      configuration
    );

    // Replace existing schedule for this month if exists
    const existingIndex = schedules.findIndex(s => s.year === year && s.month === month);
    if (existingIndex !== -1) {
      schedules[existingIndex] = newSchedule;
    } else {
      schedules.push(newSchedule);
    }

    setSchedules(schedules);
    res.json(newSchedule);
  });

  // PUT update single assignment
  router.put('/:year/:month/assignment/:assignmentId', (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const assignmentId = req.params.assignmentId;
    const { workerId } = req.body;

    const schedules = getSchedules();
    const scheduleIndex = schedules.findIndex(s => s.year === year && s.month === month);

    if (scheduleIndex === -1) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const assignmentIndex = schedules[scheduleIndex].assignments.findIndex(
      a => a.id === assignmentId
    );

    if (assignmentIndex === -1) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    schedules[scheduleIndex].assignments[assignmentIndex].workerId = workerId;
    setSchedules(schedules);

    res.json(schedules[scheduleIndex].assignments[assignmentIndex]);
  });

  // DELETE schedule for a month
  router.delete('/:year/:month', (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    const schedules = getSchedules();
    const filtered = schedules.filter(s => !(s.year === year && s.month === month));

    setSchedules(filtered);
    res.status(204).send();
  });

  return router;
}
