import { Router, Request, Response } from 'express';
import { WeeklyAvailability } from '../types/index.js';
import { AvailabilityRepo } from '../repositories/availabilityRepo.js';

export function createAvailabilityRouter(availabilityRepo: AvailabilityRepo) {
  const router = Router();

  // GET all availability
  router.get('/', (_req: Request, res: Response) => {
    res.json(availabilityRepo.getAll());
  });

  // GET availability for a specific worker
  router.get('/worker/:workerId', (req: Request, res: Response) => {
    res.json(availabilityRepo.getByWorker(req.params.workerId as string));
  });

  // GET availability for a specific week
  router.get('/week/:year/:week', (req: Request, res: Response) => {
    const year = parseInt(req.params.year as string);
    const week = parseInt(req.params.week as string);
    res.json(availabilityRepo.getByWeek(year, week));
  });

  // POST/PUT set availability (upsert)
  router.post('/', (req: Request, res: Response) => {
    const entry: WeeklyAvailability = {
      workerId: req.body.workerId,
      year: req.body.year,
      week: req.body.week,
      day: req.body.day,
      shiftType: req.body.shiftType,
      status: req.body.status
    };
    availabilityRepo.upsert(entry);
    res.json(entry);
  });

  // POST batch update availability
  router.post('/batch', (req: Request, res: Response) => {
    const entries: WeeklyAvailability[] = req.body.entries;
    const count = availabilityRepo.batchUpsert(entries);
    res.json({ updated: count });
  });

  // DELETE availability entry
  router.delete('/', (req: Request, res: Response) => {
    const { workerId, year, week, day, shiftType } = req.body;
    availabilityRepo.remove({ workerId, year, week, day, shiftType });
    res.status(204).send();
  });

  return router;
}
