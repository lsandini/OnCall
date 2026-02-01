export type WorkerRole = 'senior_specialist' | 'resident' | 'student';
export type WorkerType = 'permanent' | 'external';
export type ShiftType = 'day' | 'evening' | 'night';
export type LinePosition = 'supervisor' | 'first_line' | 'second_line' | 'third_line';
export type AvailabilityStatus = 'available' | 'preferred' | 'unavailable';

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  type: WorkerType;
  canDoubleSift: boolean;
  yearOfStudy?: number;
  active: boolean;
  createdAt: string;
}

export interface WeeklyAvailability {
  workerId: string;
  year: number;
  week: number;
  day: number;
  shiftType: ShiftType;
  status: AvailabilityStatus;
}

export interface ShiftAssignment {
  id: string;
  date: string;
  shiftType: ShiftType;
  position: LinePosition;
  workerId: string;
  isDoubleShift: boolean;
}

export interface MonthlySchedule {
  year: number;
  month: number;
  assignments: ShiftAssignment[];
  generatedAt: string;
}

export interface CalendarWeek {
  week: number;
  startDate: string;
  endDate: string;
}
