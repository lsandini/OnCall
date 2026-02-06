import { WorkerRole, LinePosition, ShiftType } from '../types';

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

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
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
