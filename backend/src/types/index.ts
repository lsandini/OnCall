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
  canDoubleSift: boolean; // For externals: can do evening + night
  yearOfStudy?: number; // For students: 4, 5, or 6
  active: boolean;
  createdAt: string;
}

export interface WeeklyAvailability {
  workerId: string;
  year: number;
  week: number; // 1-52
  day: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  shiftType: ShiftType;
  status: AvailabilityStatus;
}

export interface ShiftAssignment {
  id: string;
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
  position: LinePosition;
  workerId: string;
  isDoubleShift: boolean;
}

export interface MonthlySchedule {
  year: number;
  month: number; // 1-12
  assignments: ShiftAssignment[];
  generatedAt: string;
}

export interface ShiftRequirement {
  dayOfWeek: number; // 0-6
  shiftType: ShiftType;
  positions: LinePosition[];
}

// What each day/shift combo requires
export const SHIFT_REQUIREMENTS: ShiftRequirement[] = [
  // Monday (1) - Evening needs all lines including 3rd
  { dayOfWeek: 1, shiftType: 'evening', positions: ['supervisor', 'first_line', 'second_line', 'third_line'] },
  { dayOfWeek: 1, shiftType: 'night', positions: ['first_line'] },

  // Tuesday (2)
  { dayOfWeek: 2, shiftType: 'evening', positions: ['supervisor', 'first_line', 'second_line'] },
  { dayOfWeek: 2, shiftType: 'night', positions: ['first_line'] },

  // Wednesday (3)
  { dayOfWeek: 3, shiftType: 'evening', positions: ['supervisor', 'first_line', 'second_line'] },
  { dayOfWeek: 3, shiftType: 'night', positions: ['first_line'] },

  // Thursday (4)
  { dayOfWeek: 4, shiftType: 'evening', positions: ['supervisor', 'first_line', 'second_line'] },
  { dayOfWeek: 4, shiftType: 'night', positions: ['first_line'] },

  // Friday (5) - Evening needs all lines including 3rd
  { dayOfWeek: 5, shiftType: 'evening', positions: ['supervisor', 'first_line', 'second_line', 'third_line'] },
  { dayOfWeek: 5, shiftType: 'night', positions: ['first_line'] },

  // Saturday (6) - Full day coverage
  { dayOfWeek: 6, shiftType: 'day', positions: ['first_line', 'second_line'] },
  { dayOfWeek: 6, shiftType: 'evening', positions: ['first_line', 'second_line'] },
  { dayOfWeek: 6, shiftType: 'night', positions: ['first_line'] },

  // Sunday (0) - Full day coverage
  { dayOfWeek: 0, shiftType: 'day', positions: ['first_line', 'second_line'] },
  { dayOfWeek: 0, shiftType: 'evening', positions: ['first_line', 'second_line'] },
  { dayOfWeek: 0, shiftType: 'night', positions: ['first_line'] },
];
