import Database from 'better-sqlite3';
import { Clinic } from '../types/index.js';

interface ClinicRow {
  id: string;
  name: string;
  created_at: string;
}

function rowToClinic(row: ClinicRow): Clinic {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function createClinicRepo(db: Database.Database) {
  const stmts = {
    getAll: db.prepare('SELECT * FROM clinics ORDER BY created_at'),
    getById: db.prepare('SELECT * FROM clinics WHERE id = ?'),
    insert: db.prepare('INSERT INTO clinics (id, name, created_at) VALUES (@id, @name, @created_at)'),
    update: db.prepare('UPDATE clinics SET name = @name WHERE id = @id'),
    delete: db.prepare('DELETE FROM clinics WHERE id = ?'),
    count: db.prepare('SELECT COUNT(*) as count FROM clinics'),
    countWorkers: db.prepare('SELECT COUNT(*) as count FROM workers WHERE clinic_id = ?'),
    countConfigs: db.prepare('SELECT COUNT(*) as count FROM shift_configurations WHERE clinic_id = ?'),
    countSchedules: db.prepare('SELECT COUNT(*) as count FROM monthly_schedules WHERE clinic_id = ?'),
  };

  return {
    getAll(): Clinic[] {
      return (stmts.getAll.all() as ClinicRow[]).map(rowToClinic);
    },

    getById(id: string): Clinic | undefined {
      const row = stmts.getById.get(id) as ClinicRow | undefined;
      return row ? rowToClinic(row) : undefined;
    },

    create(clinic: Clinic): Clinic {
      stmts.insert.run({
        id: clinic.id,
        name: clinic.name,
        created_at: clinic.createdAt,
      });
      return clinic;
    },

    update(id: string, name: string): Clinic | undefined {
      const existing = stmts.getById.get(id) as ClinicRow | undefined;
      if (!existing) return undefined;
      stmts.update.run({ id, name });
      return rowToClinic({ ...existing, name });
    },

    getStats(id: string): { workerCount: number; configCount: number; scheduleCount: number } {
      const workerCount = (stmts.countWorkers.get(id) as { count: number }).count;
      const configCount = (stmts.countConfigs.get(id) as { count: number }).count;
      const scheduleCount = (stmts.countSchedules.get(id) as { count: number }).count;
      return { workerCount, configCount, scheduleCount };
    },

    delete(id: string): boolean {
      const result = stmts.delete.run(id);
      return result.changes > 0;
    },

    count(): number {
      return (stmts.count.get() as { count: number }).count;
    },

    /** Atomically check constraints and delete. Returns error string or null on success. */
    safeDelete: db.transaction((id: string): string | null => {
      const clinic = stmts.getById.get(id) as ClinicRow | undefined;
      if (!clinic) return 'Clinic not found';
      if ((stmts.count.get() as { count: number }).count <= 1) return 'Cannot delete the last clinic';
      const wc = (stmts.countWorkers.get(id) as { count: number }).count;
      const cc = (stmts.countConfigs.get(id) as { count: number }).count;
      const sc = (stmts.countSchedules.get(id) as { count: number }).count;
      if (wc > 0 || cc > 0 || sc > 0) return 'Clinic has data. Remove all workers, schedules, and configurations first.';
      stmts.delete.run(id);
      return null;
    }),
  };
}

export type ClinicRepo = ReturnType<typeof createClinicRepo>;
