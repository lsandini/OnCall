import { Router, Request, Response } from 'express';
import { ShiftConfiguration } from '../types/index.js';

export function createConfigRouter(
  getConfigurations: () => ShiftConfiguration[],
  setConfigurations: (configs: ShiftConfiguration[]) => void
) {
  const router = Router();

  // GET active configuration
  router.get('/', (_req: Request, res: Response) => {
    const configs = getConfigurations();
    const active = configs.find(c => c.isActive);
    if (!active) {
      return res.status(404).json({ error: 'No active configuration found' });
    }
    res.json(active);
  });

  // GET all configurations
  router.get('/all', (_req: Request, res: Response) => {
    res.json(getConfigurations());
  });

  // PUT update configuration
  router.put('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body as Partial<ShiftConfiguration>;
    const configs = getConfigurations();

    const index = configs.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    configs[index] = {
      ...configs[index],
      ...updates,
      id: configs[index].id, // Prevent id change
      updatedAt: new Date().toISOString()
    };

    setConfigurations(configs);
    res.json(configs[index]);
  });

  // PUT activate configuration
  router.put('/:id/activate', (req: Request, res: Response) => {
    const { id } = req.params;
    const configs = getConfigurations();

    const index = configs.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Deactivate all, then activate the requested one
    configs.forEach(c => c.isActive = false);
    configs[index].isActive = true;
    configs[index].updatedAt = new Date().toISOString();

    setConfigurations(configs);
    res.json(configs[index]);
  });

  return router;
}
