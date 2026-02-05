import Database from 'better-sqlite3';
import { createInitialWorkers, createDefaultShiftConfiguration } from '../data/initialData.js';
import { createWorkerRepo } from '../repositories/workerRepo.js';
import { createConfigRepo } from '../repositories/configRepo.js';

export function seedIfEmpty(db: Database.Database): void {
  const workerRepo = createWorkerRepo(db);
  const configRepo = createConfigRepo(db);

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
}
