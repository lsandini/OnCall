import { Router, Request, Response } from 'express';
import { WeeklyAvailability } from '../types/index.js';

export function createAvailabilityRouter(
  getAvailability: () => WeeklyAvailability[],
  setAvailability: (availability: WeeklyAvailability[]) => void
) {
  const router = Router();

  // GET all availability
  router.get('/', (_req: Request, res: Response) => {
    res.json(getAvailability());
  });

  // GET availability for a specific worker
  router.get('/worker/:workerId', (req: Request, res: Response) => {
    const availability = getAvailability().filter(a => a.workerId === req.params.workerId);
    res.json(availability);
  });

  // GET availability for a specific week
  router.get('/week/:year/:week', (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const week = parseInt(req.params.week);
    const availability = getAvailability().filter(a => a.year === year && a.week === week);
    res.json(availability);
  });

  // POST/PUT set availability (upsert)
  router.post('/', (req: Request, res: Response) => {
    const availability = getAvailability();
    const entry: WeeklyAvailability = {
      workerId: req.body.workerId,
      year: req.body.year,
      week: req.body.week,
      day: req.body.day,
      shiftType: req.body.shiftType,
      status: req.body.status
    };

    // Find existing entry
    const index = availability.findIndex(a =>
      a.workerId === entry.workerId &&
      a.year === entry.year &&
      a.week === entry.week &&
      a.day === entry.day &&
      a.shiftType === entry.shiftType
    );

    if (index === -1) {
      availability.push(entry);
    } else {
      availability[index] = entry;
    }

    setAvailability(availability);
    res.json(entry);
  });

  // POST batch update availability
  router.post('/batch', (req: Request, res: Response) => {
    const availability = getAvailability();
    const entries: WeeklyAvailability[] = req.body.entries;

    entries.forEach(entry => {
      const index = availability.findIndex(a =>
        a.workerId === entry.workerId &&
        a.year === entry.year &&
        a.week === entry.week &&
        a.day === entry.day &&
        a.shiftType === entry.shiftType
      );

      if (index === -1) {
        availability.push(entry);
      } else {
        availability[index] = entry;
      }
    });

    setAvailability(availability);
    res.json({ updated: entries.length });
  });

  // DELETE availability entry
  router.delete('/', (req: Request, res: Response) => {
    const availability = getAvailability();
    const { workerId, year, week, day, shiftType } = req.body;

    const filtered = availability.filter(a => !(
      a.workerId === workerId &&
      a.year === year &&
      a.week === week &&
      a.day === day &&
      a.shiftType === shiftType
    ));

    setAvailability(filtered);
    res.status(204).send();
  });

  return router;
}
