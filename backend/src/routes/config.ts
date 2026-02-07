import { Router, Request, Response } from 'express';
import { ShiftConfiguration, LinePosition } from '../types/index.js';
import { ConfigRepo } from '../repositories/configRepo.js';
import { HolidayRepo } from '../repositories/holidayRepo.js';
import { SettingsRepo } from '../repositories/settingsRepo.js';
import {
  getSupportedCountries,
  getSupportedStates,
  populateHolidays
} from '../services/holidayService.js';

export function createConfigRouter(
  configRepo: ConfigRepo,
  holidayRepo: HolidayRepo,
  settingsRepo: SettingsRepo
) {
  const router = Router();

  // GET active configuration for a clinic
  router.get('/', (req: Request, res: Response) => {
    const clinicId = req.query.clinicId as string;
    if (!clinicId) {
      return res.status(400).json({ error: 'clinicId query parameter is required' });
    }
    const active = configRepo.getActive(clinicId);
    if (!active) {
      return res.status(404).json({ error: 'No active configuration found' });
    }
    res.json(active);
  });

  // GET all configurations for a clinic
  router.get('/all', (req: Request, res: Response) => {
    const clinicId = req.query.clinicId as string;
    if (!clinicId) {
      return res.status(400).json({ error: 'clinicId query parameter is required' });
    }
    res.json(configRepo.getAll(clinicId));
  });

  // GET supported countries
  router.get('/countries', (_req: Request, res: Response) => {
    res.json(getSupportedCountries());
  });

  // GET states/regions for a country
  router.get('/countries/:code/states', (req: Request, res: Response) => {
    const states = getSupportedStates(req.params.code as string);
    res.json(states || []);
  });

  // GET all settings
  router.get('/settings', (_req: Request, res: Response) => {
    res.json(settingsRepo.getAll());
  });

  // PUT update settings (country, region, language)
  router.put('/settings', (req: Request, res: Response) => {
    const { country, region, language } = req.body;

    if (language) {
      if (!['en', 'fi'].includes(language)) {
        return res.status(400).json({ error: 'language must be one of: en, fi' });
      }
      settingsRepo.set('language', language);
    }

    if (country) {
      const validCodes = getSupportedCountries().map(c => c.code);
      if (!validCodes.includes(country)) {
        return res.status(400).json({ error: `country must be one of: ${validCodes.join(', ')}` });
      }
      const oldCountry = settingsRepo.get('country');
      const oldRegion = settingsRepo.get('region') || '';
      const newRegion = region || '';

      settingsRepo.set('country', country);
      settingsRepo.set('region', newRegion);

      // Re-populate holidays if country or region changed
      if (country !== oldCountry || newRegion !== oldRegion) {
        const currentYear = new Date().getFullYear();
        populateHolidays(country, newRegion || undefined, [currentYear, currentYear + 1], holidayRepo);
      }
    }

    res.json(settingsRepo.getAll());
  });

  // GET holidays for a year
  router.get('/holidays/:year', (req: Request, res: Response) => {
    const year = parseInt(req.params.year as string);
    const country = settingsRepo.get('country') || 'FI';
    res.json(holidayRepo.getByYear(year, country));
  });

  // POST add custom holiday
  router.post('/holidays', (req: Request, res: Response) => {
    const { date, name } = req.body;
    if (!date || !name) {
      return res.status(400).json({ error: 'Date and name are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date).getTime())) {
      return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }
    const country = settingsRepo.get('country') || 'FI';
    const holiday = holidayRepo.add(date, name, 'custom', country);
    res.status(201).json(holiday);
  });

  // DELETE a holiday
  router.delete('/holidays/:date', (req: Request, res: Response) => {
    const country = settingsRepo.get('country') || 'FI';
    const removed = holidayRepo.remove(req.params.date as string, country);
    if (!removed) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    res.status(204).send();
  });

  // PUT update configuration
  router.put('/:id', (req: Request, res: Response) => {
    const id = req.params.id as string;
    const updates = req.body as Partial<ShiftConfiguration>;

    const existing = configRepo.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Validate shiftTypes array if provided
    if (updates.shiftTypes !== undefined) {
      if (!Array.isArray(updates.shiftTypes)) {
        return res.status(400).json({ error: 'shiftTypes must be an array' });
      }
      for (const st of updates.shiftTypes) {
        if (!st.id || !st.name || !st.startTime || !st.endTime || typeof st.crossesMidnight !== 'boolean') {
          return res.status(400).json({ error: 'Each shiftType must have id, name, startTime, endTime, and crossesMidnight' });
        }
      }
    }

    // Validate dailyRequirements array if provided
    const validPositions: LinePosition[] = ['supervisor', 'first_line', 'second_line', 'third_line'];
    if (updates.dailyRequirements !== undefined) {
      if (!Array.isArray(updates.dailyRequirements)) {
        return res.status(400).json({ error: 'dailyRequirements must be an array' });
      }
      for (const dr of updates.dailyRequirements) {
        if (typeof dr.dayOfWeek !== 'number' || dr.dayOfWeek < 0 || dr.dayOfWeek > 6) {
          return res.status(400).json({ error: 'Each dailyRequirement must have dayOfWeek (0-6)' });
        }
        if (!dr.shiftTypeId || typeof dr.shiftTypeId !== 'string') {
          return res.status(400).json({ error: 'Each dailyRequirement must have a shiftTypeId' });
        }
        if (!Array.isArray(dr.positions) || !dr.positions.every((p: string) => validPositions.includes(p as LinePosition))) {
          return res.status(400).json({ error: `positions must be an array of: ${validPositions.join(', ')}` });
        }
      }
    }

    const merged: ShiftConfiguration = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent id change
      clinicId: existing.clinicId, // Prevent clinic change
      updatedAt: new Date().toISOString()
    };

    const result = configRepo.update(id, merged);
    res.json(result);
  });

  // PUT activate configuration
  router.put('/:id/activate', (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = configRepo.activate(id);
    if (!result) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    res.json(result);
  });

  return router;
}
