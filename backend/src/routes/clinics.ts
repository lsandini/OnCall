import { Router, Request, Response } from 'express';
import { Clinic } from '../types/index.js';
import { ClinicRepo } from '../repositories/clinicRepo.js';

export function createClinicsRouter(clinicRepo: ClinicRepo) {
  const router = Router();

  // GET all clinics
  router.get('/', (_req: Request, res: Response) => {
    res.json(clinicRepo.getAll());
  });

  // POST create clinic
  router.post('/', (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!id) {
      return res.status(400).json({ error: 'Name must contain at least one alphanumeric character' });
    }
    const clinic: Clinic = {
      id,
      name,
      createdAt: new Date().toISOString(),
    };
    try {
      clinicRepo.create(clinic);
    } catch (e: unknown) {
      const code = e instanceof Error && 'code' in e ? (e as { code: string }).code : '';
      if (code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'A clinic with this name already exists' });
      }
      throw e;
    }
    res.status(201).json(clinic);
  });

  // PUT update clinic
  router.put('/:id', (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const updated = clinicRepo.update(req.params.id as string, name);
    if (!updated) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    res.json(updated);
  });

  // GET clinic stats
  router.get('/:id/stats', (req: Request, res: Response) => {
    const clinic = clinicRepo.getById(req.params.id as string);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    res.json(clinicRepo.getStats(req.params.id as string));
  });

  // DELETE clinic (atomic check + delete)
  router.delete('/:id', (req: Request, res: Response) => {
    const error = clinicRepo.safeDelete(req.params.id as string);
    if (error) {
      const status = error === 'Clinic not found' ? 404 : 400;
      return res.status(status).json({ error });
    }
    res.status(204).send();
  });

  return router;
}
