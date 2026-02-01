import { Router, Request, Response } from 'express';
import { Worker } from '../types/index.js';

export function createWorkersRouter(
  getWorkers: () => Worker[],
  setWorkers: (workers: Worker[]) => void
) {
  const router = Router();

  // GET all workers
  router.get('/', (_req: Request, res: Response) => {
    res.json(getWorkers());
  });

  // GET single worker
  router.get('/:id', (req: Request, res: Response) => {
    const worker = getWorkers().find(w => w.id === req.params.id);
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.json(worker);
  });

  // POST create worker
  router.post('/', (req: Request, res: Response) => {
    const workers = getWorkers();
    const newWorker: Worker = {
      id: Math.random().toString(36).substring(2, 11),
      name: req.body.name,
      role: req.body.role,
      type: req.body.type || 'permanent',
      canDoubleSift: req.body.canDoubleSift || false,
      yearOfStudy: req.body.yearOfStudy,
      active: true,
      createdAt: new Date().toISOString()
    };
    workers.push(newWorker);
    setWorkers(workers);
    res.status(201).json(newWorker);
  });

  // PUT update worker
  router.put('/:id', (req: Request, res: Response) => {
    const workers = getWorkers();
    const index = workers.findIndex(w => w.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    workers[index] = {
      ...workers[index],
      name: req.body.name ?? workers[index].name,
      role: req.body.role ?? workers[index].role,
      type: req.body.type ?? workers[index].type,
      canDoubleSift: req.body.canDoubleSift ?? workers[index].canDoubleSift,
      yearOfStudy: req.body.yearOfStudy ?? workers[index].yearOfStudy,
      active: req.body.active ?? workers[index].active
    };

    setWorkers(workers);
    res.json(workers[index]);
  });

  // DELETE worker (soft delete - sets active to false)
  router.delete('/:id', (req: Request, res: Response) => {
    const workers = getWorkers();
    const index = workers.findIndex(w => w.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    workers[index].active = false;
    setWorkers(workers);
    res.status(204).send();
  });

  return router;
}
