import { Router, Request, Response } from 'express';
import { Worker } from '../types/index.js';
import { WorkerRepo } from '../repositories/workerRepo.js';

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
    const newWorker: Worker = {
      id: Math.random().toString(36).substring(2, 11),
      name: req.body.name,
      role: req.body.role,
      type: req.body.type || 'permanent',
      canDoubleSift: req.body.canDoubleSift || false,
      yearOfStudy: req.body.yearOfStudy,
      active: true,
      clinicId: req.body.clinicId,
      createdAt: new Date().toISOString()
    };
    workerRepo.create(newWorker);
    res.status(201).json(newWorker);
  });

  // PUT update worker
  router.put('/:id', (req: Request, res: Response) => {
    const updated = workerRepo.update(req.params.id as string, {
      name: req.body.name,
      role: req.body.role,
      type: req.body.type,
      canDoubleSift: req.body.canDoubleSift,
      yearOfStudy: req.body.yearOfStudy,
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
