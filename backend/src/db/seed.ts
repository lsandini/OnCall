import Database from 'better-sqlite3';
import { createInitialWorkers, createDefaultShiftConfiguration, createSurgeryWorkers, createSurgeryShiftConfiguration } from '../data/initialData.js';
import { createWorkerRepo } from '../repositories/workerRepo.js';
import { createConfigRepo } from '../repositories/configRepo.js';
import { createSettingsRepo } from '../repositories/settingsRepo.js';
import { createHolidayRepo } from '../repositories/holidayRepo.js';
import { createClinicRepo } from '../repositories/clinicRepo.js';
import { populateHolidays } from '../services/holidayService.js';

export function seedIfEmpty(db: Database.Database): void {
  const workerRepo = createWorkerRepo(db);
  const configRepo = createConfigRepo(db);
  const settingsRepo = createSettingsRepo(db);
  const holidayRepo = createHolidayRepo(db);
  const clinicRepo = createClinicRepo(db);

  // Seed clinics first
  if (clinicRepo.getAll().length === 0) {
    const now = new Date().toISOString();
    clinicRepo.create({ id: 'internal-medicine', name: 'Internal Medicine', createdAt: now });
    clinicRepo.create({ id: 'surgery', name: 'Surgery', createdAt: now });
    console.log('Seeded 2 clinics: Internal Medicine, Surgery');
  }

  if (workerRepo.count('internal-medicine') === 0) {
    const workers = createInitialWorkers('internal-medicine');
    workerRepo.createMany(workers);
    console.log(`Seeded ${workers.length} workers for Internal Medicine`);
  }

  if (configRepo.getAll('internal-medicine').length === 0) {
    const config = createDefaultShiftConfiguration('internal-medicine');
    configRepo.create(config);
    console.log(`Seeded default shift configuration: ${config.name}`);
  }

  if (workerRepo.count('surgery') === 0) {
    const workers = createSurgeryWorkers('surgery');
    workerRepo.createMany(workers);
    console.log(`Seeded ${workers.length} workers for Surgery`);
  }

  if (configRepo.getAll('surgery').length === 0) {
    const config = createSurgeryShiftConfiguration('surgery');
    configRepo.create(config);
    console.log(`Seeded default shift configuration: ${config.name}`);
  }

  if (!settingsRepo.get('country')) {
    settingsRepo.set('country', 'FI');
    const currentYear = new Date().getFullYear();
    populateHolidays('FI', undefined, [currentYear, currentYear + 1], holidayRepo);
    console.log(`Seeded default settings (country=FI) and holidays for ${currentYear}-${currentYear + 1}`);
  }

  if (!settingsRepo.get('language')) {
    settingsRepo.set('language', 'en');
    console.log('Seeded default language setting (en)');
  }
}
