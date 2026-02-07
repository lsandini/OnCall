import Database from 'better-sqlite3';
import { Worker } from '../types/index.js';

interface WorkerRow {
  id: string;
  name: string;
  role: string;
  type: string;
  can_double_shift: number;
  year_of_study: number | null;
  start_date: string | null;
  end_date: string | null;
  active: number;
  clinic_id: string;
  created_at: string;
}

function rowToWorker(row: WorkerRow): Worker {
  return {
    id: row.id,
    name: row.name,
    role: row.role as Worker['role'],
    type: row.type as Worker['type'],
    canDoubleSift: row.can_double_shift === 1,
    yearOfStudy: row.year_of_study ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    active: row.active === 1,
    clinicId: row.clinic_id,
    createdAt: row.created_at,
  };
}

export function createWorkerRepo(db: Database.Database) {
  const stmts = {
    getAll: db.prepare('SELECT * FROM workers WHERE clinic_id = ?'),
    getById: db.prepare('SELECT * FROM workers WHERE id = ?'),
    insert: db.prepare(`
      INSERT INTO workers (id, name, role, type, can_double_shift, year_of_study, start_date, end_date, active, clinic_id, created_at)
      VALUES (@id, @name, @role, @type, @can_double_shift, @year_of_study, @start_date, @end_date, @active, @clinic_id, @created_at)
    `),
    update: db.prepare(`
      UPDATE workers
      SET name = @name, role = @role, type = @type, can_double_shift = @can_double_shift,
          year_of_study = @year_of_study, active = @active
      WHERE id = @id
    `),
    softDelete: db.prepare('UPDATE workers SET active = 0 WHERE id = ?'),
    count: db.prepare('SELECT COUNT(*) AS cnt FROM workers WHERE clinic_id = ?'),
  };

  return {
    getAll(clinicId: string): Worker[] {
      return (stmts.getAll.all(clinicId) as WorkerRow[]).map(rowToWorker);
    },

    getById(id: string): Worker | undefined {
      const row = stmts.getById.get(id) as WorkerRow | undefined;
      return row ? rowToWorker(row) : undefined;
    },

    create(worker: Worker): Worker {
      stmts.insert.run({
        id: worker.id,
        name: worker.name,
        role: worker.role,
        type: worker.type,
        can_double_shift: worker.canDoubleSift ? 1 : 0,
        year_of_study: worker.yearOfStudy ?? null,
        start_date: worker.startDate ?? null,
        end_date: worker.endDate ?? null,
        active: worker.active ? 1 : 0,
        clinic_id: worker.clinicId,
        created_at: worker.createdAt,
      });
      return worker;
    },

    update(id: string, fields: Partial<Worker>): Worker | undefined {
      const existing = stmts.getById.get(id) as WorkerRow | undefined;
      if (!existing) return undefined;

      const merged = {
        id,
        name: fields.name ?? existing.name,
        role: fields.role ?? existing.role,
        type: fields.type ?? existing.type,
        can_double_shift: fields.canDoubleSift !== undefined
          ? (fields.canDoubleSift ? 1 : 0)
          : existing.can_double_shift,
        year_of_study: fields.yearOfStudy !== undefined
          ? (fields.yearOfStudy ?? null)
          : existing.year_of_study,
        active: fields.active !== undefined
          ? (fields.active ? 1 : 0)
          : existing.active,
      };
      stmts.update.run(merged);

      return this.getById(id);
    },

    softDelete(id: string): boolean {
      const info = stmts.softDelete.run(id);
      return info.changes > 0;
    },

    count(clinicId: string): number {
      return (stmts.count.get(clinicId) as { cnt: number }).cnt;
    },

    createMany: db.transaction((workers: Worker[]) => {
      for (const w of workers) {
        stmts.insert.run({
          id: w.id,
          name: w.name,
          role: w.role,
          type: w.type,
          can_double_shift: w.canDoubleSift ? 1 : 0,
          year_of_study: w.yearOfStudy ?? null,
          start_date: w.startDate ?? null,
          end_date: w.endDate ?? null,
          active: w.active ? 1 : 0,
          clinic_id: w.clinicId,
          created_at: w.createdAt,
        });
      }
    }),
  };
}

export type WorkerRepo = ReturnType<typeof createWorkerRepo>;
