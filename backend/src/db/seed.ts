import Database from 'better-sqlite3';
import { createInitialWorkers, createDefaultShiftConfiguration } from '../data/initialData.js';
import { createWorkerRepo } from '../repositories/workerRepo.js';
import { createConfigRepo } from '../repositories/configRepo.js';
import { createSettingsRepo } from '../repositories/settingsRepo.js';
import { createHolidayRepo } from '../repositories/holidayRepo.js';
import { populateHolidays } from '../services/holidayService.js';

export function seedIfEmpty(db: Database.Database): void {
  const workerRepo = createWorkerRepo(db);
  const configRepo = createConfigRepo(db);
  const settingsRepo = createSettingsRepo(db);
  const holidayRepo = createHolidayRepo(db);

  if (workerRepo.count() === 0) {
    const workers = createInitialWorkers();
    workerRepo.createMany(workers);
    console.log(`Seeded ${workers.length} workers`);
  }

  if (configRepo.getAll().length === 0) {
    const config = createDefaultShiftConfiguration();
    configRepo.create(config);
    console.log(`Seeded default shift configuration: ${config.name}`);
  }

  if (!settingsRepo.get('country')) {
    settingsRepo.set('country', 'FI');
    const currentYear = new Date().getFullYear();
    populateHolidays('FI', undefined, [currentYear, currentYear + 1], holidayRepo);
    console.log(`Seeded default settings (country=FI) and holidays for ${currentYear}-${currentYear + 1}`);
  }
}
