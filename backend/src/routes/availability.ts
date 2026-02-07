import { Router, Request, Response } from 'express';
import { WeeklyAvailability, ShiftType, AvailabilityStatus } from '../types/index.js';
import { AvailabilityRepo } from '../repositories/availabilityRepo.js';

const VALID_SHIFT_TYPES: ShiftType[] = ['day', 'evening', 'night'];
const VALID_STATUSES: AvailabilityStatus[] = ['available', 'preferred', 'unavailable'];

function validateAvailabilityEntry(body: Record<string, unknown>): string | null {
  if (!body.workerId || typeof body.workerId !== 'string') return 'workerId is required';
  if (typeof body.year !== 'number' || !Number.isInteger(body.year)) return 'year must be an integer';
  if (typeof body.week !== 'number' || !Number.isInteger(body.week) || body.week < 1 || body.week > 53) return 'week must be 1-53';
  if (typeof body.day !== 'number' || !Number.isInteger(body.day) || body.day < 0 || body.day > 6) return 'day must be 0-6';
  if (!VALID_SHIFT_TYPES.includes(body.shiftType as ShiftType)) return `shiftType must be one of: ${VALID_SHIFT_TYPES.join(', ')}`;
  if (!VALID_STATUSES.includes(body.status as AvailabilityStatus)) return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  return null;
}

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
    const validationError = validateAvailabilityEntry(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
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
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'entries must be an array' });
    }
    for (let i = 0; i < entries.length; i++) {
      const err = validateAvailabilityEntry(entries[i]);
      if (err) {
        return res.status(400).json({ error: `Entry ${i}: ${err}` });
      }
    }
    const count = availabilityRepo.batchUpsert(entries);
    res.json({ updated: count });
  });

  // DELETE availability entry
  router.delete('/', (req: Request, res: Response) => {
    const { workerId, year, week, day, shiftType } = req.body;
    const removed = availabilityRepo.remove({ workerId, year, week, day, shiftType });
    if (!removed) {
      return res.status(404).json({ error: 'Availability entry not found' });
    }
    res.status(204).send();
  });

  return router;
}
