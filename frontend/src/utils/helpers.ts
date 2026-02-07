import { WorkerRole, LinePosition, ShiftType } from '../types';
import type { Locale, Translations } from '../i18n';
import { en } from '../i18n/locales/en';
import { fi } from '../i18n/locales/fi';

// Locale-aware label functions
export function getRoleLabels(translations: Translations): Record<WorkerRole, string> {
  return {
    senior_specialist: translations.roles.seniorSpecialist,
    resident: translations.roles.resident,
    student: translations.roles.student,
  };
}

export function getPositionLabels(translations: Translations): Record<LinePosition, string> {
  return {
    supervisor: translations.positions.supervisor,
    first_line: translations.positions.firstLine,
    second_line: translations.positions.secondLine,
    third_line: translations.positions.thirdLine,
  };
}

export function getMonthNames(translations: Translations): string[] {
  const m = translations.months;
  return [m.january, m.february, m.march, m.april, m.may, m.june,
    m.july, m.august, m.september, m.october, m.november, m.december];
}

export function getDayNames(translations: Translations): string[] {
  const d = translations.daysShort;
  return [d.sun, d.mon, d.tue, d.wed, d.thu, d.fri, d.sat];
}

export function getDayNamesFull(translations: Translations): string[] {
  const d = translations.days;
  return [d.sunday, d.monday, d.tuesday, d.wednesday, d.thursday, d.friday, d.saturday];
}

// Translate known shift type IDs, falling back to the DB name for custom types
const SHIFT_NAME_KEYS: Record<string, keyof Translations['shifts']> = {
  day: 'day',
  evening: 'evening',
  night: 'night',
};

export function getShiftName(shiftId: string, dbName: string, translations: Translations): string {
  const key = SHIFT_NAME_KEYS[shiftId];
  return key ? translations.shifts[key] : dbName;
}

// Translate known config names, falling back to DB value for custom configs
const KNOWN_CONFIG_NAMES: Record<string, keyof Pick<Translations['config'], 'configName'>> = {
  'Internal Medicine': 'configName',
};
const KNOWN_CONFIG_DESCS: Record<string, keyof Pick<Translations['config'], 'configDescription'>> = {
  'Default shift configuration for Internal Medicine clinic': 'configDescription',
};

export function getConfigName(dbName: string, translations: Translations): string {
  const key = KNOWN_CONFIG_NAMES[dbName];
  return key ? translations.config[key] : dbName;
}

export function getConfigDescription(dbDesc: string, translations: Translations): string {
  const key = KNOWN_CONFIG_DESCS[dbDesc];
  return key ? translations.config[key] : dbDesc;
}

// Reverse-lookup: map any stored clinic name (in any locale) to its specialty key
const nameToSpecialtyKey: Record<string, keyof Translations['specialties']> = {};
for (const key of Object.keys(en.specialties) as (keyof Translations['specialties'])[]) {
  nameToSpecialtyKey[en.specialties[key]] = key;
  nameToSpecialtyKey[fi.specialties[key]] = key;
}

/** Display a clinic name in the current locale (falls back to stored name for custom clinics) */
export function getClinicDisplayName(storedName: string, translations: Translations): string {
  const key = nameToSpecialtyKey[storedName];
  return key ? translations.specialties[key] : storedName;
}

/** Find the specialty key for a stored clinic name, if any */
export function getSpecialtyKey(storedName: string): keyof Translations['specialties'] | null {
  return nameToSpecialtyKey[storedName] ?? null;
}

// Backward-compat constants (English defaults)
export const ROLE_LABELS: Record<WorkerRole, string> = {
  senior_specialist: 'Senior Specialist',
  resident: 'Resident',
  student: 'Medical Student'
};

export const POSITION_LABELS: Record<LinePosition, string> = {
  supervisor: 'Supervisor',
  first_line: '1st Line',
  second_line: '2nd Line',
  third_line: '3rd Line'
};

export const SHIFT_LABELS: Record<ShiftType, string> = {
  day: 'Day (8-15)',
  evening: 'Evening (15-22)',
  night: 'Night (22-8)'
};

export const SHIFT_COLORS: Record<ShiftType, string> = {
  day: 'bg-clay-100 text-clay-800 border-clay-300',
  evening: 'bg-clinic-100 text-clinic-800 border-clinic-300',
  night: 'bg-steel-200 text-steel-800 border-steel-400'
};

export const POSITION_COLORS: Record<LinePosition, string> = {
  supervisor: 'bg-clay-50 border-clay-300 text-clay-700',
  first_line: 'bg-steel-100 border-steel-300 text-steel-700',
  second_line: 'bg-clinic-50 border-clinic-300 text-clinic-700',
  third_line: 'bg-steel-50 border-steel-300 text-steel-600'
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatDate(dateStr: string, locale?: Locale): string {
  const date = new Date(dateStr);
  const loc = locale === 'fi' ? 'fi-FI' : 'en-GB';
  return date.toLocaleDateString(loc, { day: '2-digit', month: 'short' });
}

export function formatDateFull(dateStr: string | undefined, locale?: Locale): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const loc = locale === 'fi' ? 'fi-FI' : 'en-GB';
  return date.toLocaleDateString(loc, { day: 'numeric', month: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr: string, locale?: Locale): string {
  const date = new Date(dateStr);
  const loc = locale === 'fi' ? 'fi-FI' : 'en-GB';
  return date.toLocaleString(loc);
}

export function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay();
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
