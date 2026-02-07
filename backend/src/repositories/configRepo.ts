import Database from 'better-sqlite3';
import { ShiftConfiguration, ShiftTypeDefinition, DailyShiftRequirement, LinePosition } from '../types/index.js';

interface ConfigRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  is_active: number;
  clinic_id: string;
}

interface ShiftTypeRow {
  config_id: string;
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  crosses_midnight: number;
}

interface RequirementRow {
  id: number;
  config_id: string;
  day_of_week: number;
  shift_type_id: string;
  positions: string;
}

function assembleConfig(
  row: ConfigRow,
  shiftTypes: ShiftTypeRow[],
  requirements: RequirementRow[]
): ShiftConfiguration {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    shiftTypes: shiftTypes.map(st => ({
      id: st.id,
      name: st.name,
      startTime: st.start_time,
      endTime: st.end_time,
      crossesMidnight: st.crosses_midnight === 1,
    })),
    dailyRequirements: requirements.map(r => ({
      dayOfWeek: r.day_of_week,
      shiftTypeId: r.shift_type_id,
      positions: r.positions.split(',') as LinePosition[],
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active === 1,
    clinicId: row.clinic_id,
  };
}

export function createConfigRepo(db: Database.Database) {
  const stmts = {
    getAll: db.prepare('SELECT * FROM shift_configurations WHERE clinic_id = ?'),
    getById: db.prepare('SELECT * FROM shift_configurations WHERE id = ?'),
    getActive: db.prepare('SELECT * FROM shift_configurations WHERE clinic_id = ? AND is_active = 1 LIMIT 1'),
    getShiftTypes: db.prepare('SELECT * FROM shift_type_definitions WHERE config_id = ?'),
    getRequirements: db.prepare('SELECT * FROM daily_shift_requirements WHERE config_id = ?'),
    insertConfig: db.prepare(`
      INSERT INTO shift_configurations (id, name, description, created_at, updated_at, is_active, clinic_id)
      VALUES (@id, @name, @description, @created_at, @updated_at, @is_active, @clinic_id)
    `),
    insertShiftType: db.prepare(`
      INSERT INTO shift_type_definitions (config_id, id, name, start_time, end_time, crosses_midnight)
      VALUES (@config_id, @id, @name, @start_time, @end_time, @crosses_midnight)
    `),
    insertRequirement: db.prepare(`
      INSERT INTO daily_shift_requirements (config_id, day_of_week, shift_type_id, positions)
      VALUES (@config_id, @day_of_week, @shift_type_id, @positions)
    `),
    updateConfig: db.prepare(`
      UPDATE shift_configurations
      SET name = @name, description = @description, updated_at = @updated_at, is_active = @is_active
      WHERE id = @id
    `),
    deleteShiftTypes: db.prepare('DELETE FROM shift_type_definitions WHERE config_id = ?'),
    deleteRequirements: db.prepare('DELETE FROM daily_shift_requirements WHERE config_id = ?'),
    deactivateAllForClinic: db.prepare('UPDATE shift_configurations SET is_active = 0 WHERE clinic_id = ?'),
    activate: db.prepare('UPDATE shift_configurations SET is_active = 1, updated_at = ? WHERE id = ?'),
  };

  function loadConfig(row: ConfigRow): ShiftConfiguration {
    const shiftTypes = stmts.getShiftTypes.all(row.id) as ShiftTypeRow[];
    const requirements = stmts.getRequirements.all(row.id) as RequirementRow[];
    return assembleConfig(row, shiftTypes, requirements);
  }

  const createTx = db.transaction((config: ShiftConfiguration) => {
    stmts.insertConfig.run({
      id: config.id,
      name: config.name,
      description: config.description ?? null,
      created_at: config.createdAt,
      updated_at: config.updatedAt,
      is_active: config.isActive ? 1 : 0,
      clinic_id: config.clinicId,
    });
    for (const st of config.shiftTypes) {
      stmts.insertShiftType.run({
        config_id: config.id,
        id: st.id,
        name: st.name,
        start_time: st.startTime,
        end_time: st.endTime,
        crosses_midnight: st.crossesMidnight ? 1 : 0,
      });
    }
    for (const r of config.dailyRequirements) {
      stmts.insertRequirement.run({
        config_id: config.id,
        day_of_week: r.dayOfWeek,
        shift_type_id: r.shiftTypeId,
        positions: r.positions.join(','),
      });
    }
  });

  const updateTx = db.transaction((id: string, config: ShiftConfiguration) => {
    stmts.updateConfig.run({
      id,
      name: config.name,
      description: config.description ?? null,
      updated_at: config.updatedAt,
      is_active: config.isActive ? 1 : 0,
    });
    // Replace child rows
    stmts.deleteShiftTypes.run(id);
    stmts.deleteRequirements.run(id);
    for (const st of config.shiftTypes) {
      stmts.insertShiftType.run({
        config_id: id,
        id: st.id,
        name: st.name,
        start_time: st.startTime,
        end_time: st.endTime,
        crosses_midnight: st.crossesMidnight ? 1 : 0,
      });
    }
    for (const r of config.dailyRequirements) {
      stmts.insertRequirement.run({
        config_id: id,
        day_of_week: r.dayOfWeek,
        shift_type_id: r.shiftTypeId,
        positions: r.positions.join(','),
      });
    }
  });

  const activateTx = db.transaction((id: string, clinicId: string) => {
    stmts.deactivateAllForClinic.run(clinicId);
    stmts.activate.run(new Date().toISOString(), id);
  });

  return {
    getAll(clinicId: string): ShiftConfiguration[] {
      const rows = stmts.getAll.all(clinicId) as ConfigRow[];
      return rows.map(loadConfig);
    },

    getActive(clinicId: string): ShiftConfiguration | undefined {
      const row = stmts.getActive.get(clinicId) as ConfigRow | undefined;
      return row ? loadConfig(row) : undefined;
    },

    getById(id: string): ShiftConfiguration | undefined {
      const row = stmts.getById.get(id) as ConfigRow | undefined;
      return row ? loadConfig(row) : undefined;
    },

    create(config: ShiftConfiguration): ShiftConfiguration {
      createTx(config);
      return config;
    },

    update(id: string, config: ShiftConfiguration): ShiftConfiguration | undefined {
      const existing = stmts.getById.get(id) as ConfigRow | undefined;
      if (!existing) return undefined;
      updateTx(id, config);
      return this.getById(id);
    },

    activate(id: string): ShiftConfiguration | undefined {
      const existing = stmts.getById.get(id) as ConfigRow | undefined;
      if (!existing) return undefined;
      activateTx(id, existing.clinic_id);
      return this.getById(id);
    },
  };
}

export type ConfigRepo = ReturnType<typeof createConfigRepo>;
