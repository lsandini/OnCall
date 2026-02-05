import Database from 'better-sqlite3';
import { MonthlySchedule, ShiftAssignment } from '../types/index.js';

interface ScheduleRow {
  year: number;
  month: number;
  generated_at: string;
}

interface AssignmentRow {
  id: string;
  schedule_year: number;
  schedule_month: number;
  date: string;
  shift_type: string;
  position: string;
  worker_id: string;
  is_double_shift: number;
}

function rowToAssignment(row: AssignmentRow): ShiftAssignment {
  return {
    id: row.id,
    date: row.date,
    shiftType: row.shift_type as ShiftAssignment['shiftType'],
    position: row.position as ShiftAssignment['position'],
    workerId: row.worker_id,
    isDoubleShift: row.is_double_shift === 1,
  };
}

function scheduleFromRows(scheduleRow: ScheduleRow, assignmentRows: AssignmentRow[]): MonthlySchedule {
  return {
    year: scheduleRow.year,
    month: scheduleRow.month,
    assignments: assignmentRows.map(rowToAssignment),
    generatedAt: scheduleRow.generated_at,
  };
}

export function createScheduleRepo(db: Database.Database) {
  const stmts = {
    getAllSchedules: db.prepare('SELECT * FROM monthly_schedules ORDER BY year, month'),
    getSchedule: db.prepare('SELECT * FROM monthly_schedules WHERE year = ? AND month = ?'),
    getAssignments: db.prepare('SELECT * FROM shift_assignments WHERE schedule_year = ? AND schedule_month = ?'),
    getAllAssignments: db.prepare('SELECT * FROM shift_assignments ORDER BY schedule_year, schedule_month, date'),
    insertSchedule: db.prepare(`
      INSERT OR REPLACE INTO monthly_schedules (year, month, generated_at)
      VALUES (@year, @month, @generated_at)
    `),
    insertAssignment: db.prepare(`
      INSERT INTO shift_assignments (id, schedule_year, schedule_month, date, shift_type, position, worker_id, is_double_shift)
      VALUES (@id, @schedule_year, @schedule_month, @date, @shift_type, @position, @worker_id, @is_double_shift)
    `),
    deleteAssignments: db.prepare('DELETE FROM shift_assignments WHERE schedule_year = ? AND schedule_month = ?'),
    deleteSchedule: db.prepare('DELETE FROM monthly_schedules WHERE year = ? AND month = ?'),
    getAssignment: db.prepare('SELECT * FROM shift_assignments WHERE id = ?'),
    updateAssignmentWorker: db.prepare('UPDATE shift_assignments SET worker_id = ? WHERE id = ?'),
  };

  const saveTx = db.transaction((schedule: MonthlySchedule) => {
    // Delete existing assignments for this month first
    stmts.deleteAssignments.run(schedule.year, schedule.month);
    // Upsert the schedule header
    stmts.insertSchedule.run({
      year: schedule.year,
      month: schedule.month,
      generated_at: schedule.generatedAt,
    });
    // Insert all assignments
    for (const a of schedule.assignments) {
      stmts.insertAssignment.run({
        id: a.id,
        schedule_year: schedule.year,
        schedule_month: schedule.month,
        date: a.date,
        shift_type: a.shiftType,
        position: a.position,
        worker_id: a.workerId,
        is_double_shift: a.isDoubleShift ? 1 : 0,
      });
    }
  });

  return {
    getAll(): MonthlySchedule[] {
      const schedules = stmts.getAllSchedules.all() as ScheduleRow[];
      return schedules.map(s => {
        const assignments = stmts.getAssignments.all(s.year, s.month) as AssignmentRow[];
        return scheduleFromRows(s, assignments);
      });
    },

    getByMonth(year: number, month: number): MonthlySchedule | undefined {
      const s = stmts.getSchedule.get(year, month) as ScheduleRow | undefined;
      if (!s) return undefined;
      const assignments = stmts.getAssignments.all(year, month) as AssignmentRow[];
      return scheduleFromRows(s, assignments);
    },

    save(schedule: MonthlySchedule): MonthlySchedule {
      saveTx(schedule);
      return schedule;
    },

    updateAssignment(assignmentId: string, workerId: string): ShiftAssignment | undefined {
      stmts.updateAssignmentWorker.run(workerId, assignmentId);
      const row = stmts.getAssignment.get(assignmentId) as AssignmentRow | undefined;
      return row ? rowToAssignment(row) : undefined;
    },

    deleteByMonth(year: number, month: number): boolean {
      // Cascade: deleting the schedule deletes assignments via FK
      const info = stmts.deleteSchedule.run(year, month);
      return info.changes > 0;
    },
  };
}

export type ScheduleRepo = ReturnType<typeof createScheduleRepo>;
