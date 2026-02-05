import Database from 'better-sqlite3';
import { WeeklyAvailability } from '../types/index.js';

interface AvailabilityRow {
  worker_id: string;
  year: number;
  week: number;
  day: number;
  shift_type: string;
  status: string;
}

function rowToAvailability(row: AvailabilityRow): WeeklyAvailability {
  return {
    workerId: row.worker_id,
    year: row.year,
    week: row.week,
    day: row.day,
    shiftType: row.shift_type as WeeklyAvailability['shiftType'],
    status: row.status as WeeklyAvailability['status'],
  };
}

export function createAvailabilityRepo(db: Database.Database) {
  const stmts = {
    getAll: db.prepare('SELECT * FROM weekly_availability'),
    getByWorker: db.prepare('SELECT * FROM weekly_availability WHERE worker_id = ?'),
    getByWeek: db.prepare('SELECT * FROM weekly_availability WHERE year = ? AND week = ?'),
    upsert: db.prepare(`
      INSERT OR REPLACE INTO weekly_availability (worker_id, year, week, day, shift_type, status)
      VALUES (@worker_id, @year, @week, @day, @shift_type, @status)
    `),
    remove: db.prepare(`
      DELETE FROM weekly_availability
      WHERE worker_id = @worker_id AND year = @year AND week = @week AND day = @day AND shift_type = @shift_type
    `),
  };

  const batchUpsertTx = db.transaction((entries: WeeklyAvailability[]) => {
    for (const e of entries) {
      stmts.upsert.run({
        worker_id: e.workerId,
        year: e.year,
        week: e.week,
        day: e.day,
        shift_type: e.shiftType,
        status: e.status,
      });
    }
  });

  return {
    getAll(): WeeklyAvailability[] {
      return (stmts.getAll.all() as AvailabilityRow[]).map(rowToAvailability);
    },

    getByWorker(workerId: string): WeeklyAvailability[] {
      return (stmts.getByWorker.all(workerId) as AvailabilityRow[]).map(rowToAvailability);
    },

    getByWeek(year: number, week: number): WeeklyAvailability[] {
      return (stmts.getByWeek.all(year, week) as AvailabilityRow[]).map(rowToAvailability);
    },

    upsert(entry: WeeklyAvailability): WeeklyAvailability {
      stmts.upsert.run({
        worker_id: entry.workerId,
        year: entry.year,
        week: entry.week,
        day: entry.day,
        shift_type: entry.shiftType,
        status: entry.status,
      });
      return entry;
    },

    batchUpsert(entries: WeeklyAvailability[]): number {
      batchUpsertTx(entries);
      return entries.length;
    },

    remove(entry: Pick<WeeklyAvailability, 'workerId' | 'year' | 'week' | 'day' | 'shiftType'>): boolean {
      const info = stmts.remove.run({
        worker_id: entry.workerId,
        year: entry.year,
        week: entry.week,
        day: entry.day,
        shift_type: entry.shiftType,
      });
      return info.changes > 0;
    },
  };
}

export type AvailabilityRepo = ReturnType<typeof createAvailabilityRepo>;
