import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'oncall.db');

export function openDatabase(): Database.Database {
  const db = new Database(DB_PATH);

  // Enable WAL mode and foreign keys
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables(db);

  return db;
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'permanent',
      can_double_shift INTEGER NOT NULL DEFAULT 0,
      year_of_study INTEGER,
      start_date TEXT,
      end_date TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_availability (
      worker_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      week INTEGER NOT NULL,
      day INTEGER NOT NULL,
      shift_type TEXT NOT NULL,
      status TEXT NOT NULL,
      PRIMARY KEY (worker_id, year, week, day, shift_type),
      FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS monthly_schedules (
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      generated_at TEXT NOT NULL,
      PRIMARY KEY (year, month)
    );

    CREATE TABLE IF NOT EXISTS shift_assignments (
      id TEXT PRIMARY KEY,
      schedule_year INTEGER NOT NULL,
      schedule_month INTEGER NOT NULL,
      date TEXT NOT NULL,
      shift_type TEXT NOT NULL,
      position TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      is_double_shift INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (schedule_year, schedule_month) REFERENCES monthly_schedules(year, month) ON DELETE CASCADE,
      FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shift_configurations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shift_type_definitions (
      config_id TEXT NOT NULL,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      crosses_midnight INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (config_id, id),
      FOREIGN KEY (config_id) REFERENCES shift_configurations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_shift_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      shift_type_id TEXT NOT NULL,
      positions TEXT NOT NULL,
      FOREIGN KEY (config_id) REFERENCES shift_configurations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS holidays (
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'public',
      country TEXT NOT NULL,
      PRIMARY KEY (date, country)
    );
  `);
}
