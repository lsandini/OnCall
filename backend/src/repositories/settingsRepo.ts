import Database from 'better-sqlite3';

export interface SettingsRepo {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  getAll(): Record<string, string>;
}

export function createSettingsRepo(db: Database.Database): SettingsRepo {
  const getStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const upsertStmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const getAllStmt = db.prepare('SELECT key, value FROM settings');

  return {
    get(key: string): string | undefined {
      const row = getStmt.get(key) as { value: string } | undefined;
      return row?.value;
    },

    set(key: string, value: string): void {
      upsertStmt.run(key, value);
    },

    getAll(): Record<string, string> {
      const rows = getAllStmt.all() as { key: string; value: string }[];
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = row.value;
      }
      return result;
    }
  };
}
