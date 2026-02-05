import { Router, Request, Response } from 'express';
import { ShiftConfiguration } from '../types/index.js';
import { ConfigRepo } from '../repositories/configRepo.js';

export function createConfigRouter(configRepo: ConfigRepo) {
  const router = Router();

  // GET active configuration
  router.get('/', (_req: Request, res: Response) => {
    const active = configRepo.getActive();
    if (!active) {
      return res.status(404).json({ error: 'No active configuration found' });
    }
    res.json(active);
  });

  // GET all configurations
  router.get('/all', (_req: Request, res: Response) => {
    res.json(configRepo.getAll());
  });

  // PUT update configuration
  router.put('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body as Partial<ShiftConfiguration>;

    const existing = configRepo.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const merged: ShiftConfiguration = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent id change
      updatedAt: new Date().toISOString()
    };

    const result = configRepo.update(id, merged);
    res.json(result);
  });

  // PUT activate configuration
  router.put('/:id/activate', (req: Request, res: Response) => {
    const { id } = req.params;
    const result = configRepo.activate(id);
    if (!result) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    res.json(result);
  });

  return router;
}
