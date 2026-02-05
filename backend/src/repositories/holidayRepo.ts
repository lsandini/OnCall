import Database from 'better-sqlite3';
import { Holiday } from '../types/index.js';

export interface HolidayRepo {
  getByYear(year: number, country: string): Holiday[];
  getByDateRange(start: string, end: string, country: string): Holiday[];
  isHoliday(date: string, country: string): boolean;
  add(date: string, name: string, type: 'public' | 'custom', country: string): Holiday;
  remove(date: string, country: string): boolean;
  replacePublicHolidays(country: string, holidays: { date: string; name: string }[]): void;
  getAll(country: string): Holiday[];
}

export function createHolidayRepo(db: Database.Database): HolidayRepo {
  const getByYearStmt = db.prepare(
    "SELECT date, name, type, country FROM holidays WHERE country = ? AND date LIKE ? || '%' ORDER BY date"
  );
  const getByRangeStmt = db.prepare(
    'SELECT date, name, type, country FROM holidays WHERE country = ? AND date >= ? AND date <= ? ORDER BY date'
  );
  const isHolidayStmt = db.prepare(
    'SELECT 1 FROM holidays WHERE date = ? AND country = ?'
  );
  const insertStmt = db.prepare(
    'INSERT OR REPLACE INTO holidays (date, name, type, country) VALUES (?, ?, ?, ?)'
  );
  const deleteStmt = db.prepare(
    'DELETE FROM holidays WHERE date = ? AND country = ?'
  );
  const deletePublicStmt = db.prepare(
    "DELETE FROM holidays WHERE country = ? AND type = 'public'"
  );
  const getAllStmt = db.prepare(
    'SELECT date, name, type, country FROM holidays WHERE country = ? ORDER BY date'
  );

  const replaceTransaction = db.transaction(
    (country: string, holidays: { date: string; name: string }[]) => {
      deletePublicStmt.run(country);
      for (const h of holidays) {
        insertStmt.run(h.date, h.name, 'public', country);
      }
    }
  );

  return {
    getByYear(year: number, country: string): Holiday[] {
      return getByYearStmt.all(country, String(year)) as Holiday[];
    },

    getByDateRange(start: string, end: string, country: string): Holiday[] {
      return getByRangeStmt.all(country, start, end) as Holiday[];
    },

    isHoliday(date: string, country: string): boolean {
      return !!isHolidayStmt.get(date, country);
    },

    add(date: string, name: string, type: 'public' | 'custom', country: string): Holiday {
      insertStmt.run(date, name, type, country);
      return { date, name, type, country };
    },

    remove(date: string, country: string): boolean {
      const result = deleteStmt.run(date, country);
      return result.changes > 0;
    },

    replacePublicHolidays(country: string, holidays: { date: string; name: string }[]): void {
      replaceTransaction(country, holidays);
    },

    getAll(country: string): Holiday[] {
      return getAllStmt.all(country) as Holiday[];
    }
  };
}
