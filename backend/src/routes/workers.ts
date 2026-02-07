import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Worker, WorkerRole, WorkerType } from '../types/index.js';
import { WorkerRepo } from '../repositories/workerRepo.js';

const VALID_ROLES: WorkerRole[] = ['senior_specialist', 'resident', 'student'];
const VALID_TYPES: WorkerType[] = ['permanent', 'external'];

export function createWorkersRouter(workerRepo: WorkerRepo) {
  const router = Router();

  // GET all workers for a clinic
  router.get('/', (req: Request, res: Response) => {
    const clinicId = req.query.clinicId as string;
    if (!clinicId) {
      return res.status(400).json({ error: 'clinicId query parameter is required' });
    }
    res.json(workerRepo.getAll(clinicId));
  });

  // GET single worker
  router.get('/:id', (req: Request, res: Response) => {
    const worker = workerRepo.getById(req.params.id as string);
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.json(worker);
  });

  // POST create worker
  router.post('/', (req: Request, res: Response) => {
    const { name, role, type, clinicId } = req.body;
    if (!name || !role || !clinicId) {
      return res.status(400).json({ error: 'name, role, and clinicId are required' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }
    const workerType = type || 'permanent';
    if (!VALID_TYPES.includes(workerType)) {
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    const newWorker: Worker = {
      id: randomUUID(),
      name,
      role,
      type: workerType,
      canDoubleShift: req.body.canDoubleShift ?? false,
      yearOfStudy: req.body.yearOfStudy,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      active: true,
      clinicId,
      createdAt: new Date().toISOString()
    };
    try {
      workerRepo.create(newWorker);
    } catch (e: unknown) {
      if (e instanceof Error && 'code' in e && (e as { code: string }).code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        return res.status(400).json({ error: 'Invalid clinicId' });
      }
      throw e;
    }
    res.status(201).json(newWorker);
  });

  // PUT update worker
  router.put('/:id', (req: Request, res: Response) => {
    if (req.body.role && !VALID_ROLES.includes(req.body.role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }
    if (req.body.type && !VALID_TYPES.includes(req.body.type)) {
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    const updated = workerRepo.update(req.params.id as string, {
      name: req.body.name,
      role: req.body.role,
      type: req.body.type,
      canDoubleShift: req.body.canDoubleShift,
      yearOfStudy: req.body.yearOfStudy,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      active: req.body.active,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.json(updated);
  });

  // DELETE worker (soft delete - sets active to false)
  router.delete('/:id', (req: Request, res: Response) => {
    const deleted = workerRepo.softDelete(req.params.id as string);
    if (!deleted) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.status(204).send();
  });

  return router;
}
