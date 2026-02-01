export type WorkerRole = 'senior_specialist' | 'resident' | 'student';
export type WorkerType = 'permanent' | 'external';
export type ShiftType = 'day' | 'evening' | 'night';
export type LinePosition = 'supervisor' | 'first_line' | 'second_line' | 'third_line';
export type AvailabilityStatus = 'available' | 'preferred' | 'unavailable';

// Configurable shift structure types
export interface ShiftTypeDefinition {
  id: string;              // e.g., 'evening', 'night', 'day'
  name: string;            // Display name
  startTime: string;       // "15:00"
  endTime: string;         // "22:00"
  crossesMidnight: boolean;
}

export interface DailyShiftRequirement {
  dayOfWeek: number;       // 0=Sunday ... 6=Saturday
  shiftTypeId: string;     // Reference to ShiftTypeDefinition.id
  positions: LinePosition[];
}

export interface ShiftConfiguration {
  id: string;
  name: string;            // e.g., "Internal Medicine"
  description?: string;
  shiftTypes: ShiftTypeDefinition[];
  dailyRequirements: DailyShiftRequirement[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  type: WorkerType;
  canDoubleSift: boolean; // For externals: can do evening + night
  yearOfStudy?: number; // For students: 4, 5, or 6
  startDate?: string; // Employment start date (YYYY-MM-DD)
  endDate?: string; // Employment end date (YYYY-MM-DD), undefined = ongoing
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

// =============================================================================
// SHIFT SCHEDULE OVERVIEW
// =============================================================================
//
// WEEKDAYS (Mon-Fri):
//   Evening (15:00-22:00): Supervisor + 1st Line + 2nd Line (+ 3rd Line Mon/Fri)
//   Night (22:00-08:00):   1st Line only
//   Note: Supervisor covers evening+night as one continuous on-call period
//
// WEEKENDS (Sat-Sun):
//   Day (09:00-22:00):     Supervisor + 1st Line + 2nd Line (one continuous shift)
//   Night:                 1st Line only
//     - Saturday night: 22:00 to 09:00 Sunday
//     - Sunday night:   22:00 to 08:00 Monday
//   Note: Supervisor covers full 24h (Sat 09:00-Sun 09:00, Sun 09:00-Mon 08:00)
//
// SUPERVISOR ON-CALL PERIODS:
//   Mon-Thu: 15:00 to 08:00 next day
//   Friday:  15:00 to 09:00 Saturday
//   Saturday: 09:00 to 09:00 Sunday (24h)
//   Sunday:   09:00 to 08:00 Monday
// =============================================================================

export const SHIFT_REQUIREMENTS: ShiftRequirement[] = [
  // Monday (1) - Evening needs all lines including 3rd; supervisor covers evening+night
  { dayOfWeek: 1, shiftType: 'evening', positions: ['supervisor', 'first_line', 'second_line', 'third_line'] },
  { dayOfWeek: 1, shiftType: 'night', positions: ['first_line'] },

  // Tuesday (2) - supervisor covers evening+night
  { dayOfWeek: 2, shiftType: 'evening', positions: ['supervisor', 'first_line', 'second_line'] },
  { dayOfWeek: 2, shiftType: 'night', positions: ['first_line'] },

  // Wednesday (3) - supervisor covers evening+night
  { dayOfWeek: 3, shiftType: 'evening', positions: ['supervisor', 'first_line', 'second_line'] },
  { dayOfWeek: 3, shiftType: 'night', positions: ['first_line'] },

  // Thursday (4) - supervisor covers evening+night
  { dayOfWeek: 4, shiftType: 'evening', positions: ['supervisor', 'first_line', 'second_line'] },
  { dayOfWeek: 4, shiftType: 'night', positions: ['first_line'] },

  // Friday (5) - Evening needs all lines including 3rd; supervisor covers evening+night (until 09:00 Sat)
  { dayOfWeek: 5, shiftType: 'evening', positions: ['supervisor', 'first_line', 'second_line', 'third_line'] },
  { dayOfWeek: 5, shiftType: 'night', positions: ['first_line'] },

  // Saturday (6) - Day shift is 09:00-22:00 (combined day+evening for 1st/2nd line)
  // Supervisor works 09:00 Sat to 09:00 Sun (24h continuous)
  { dayOfWeek: 6, shiftType: 'day', positions: ['supervisor', 'first_line', 'second_line'] },
  { dayOfWeek: 6, shiftType: 'night', positions: ['first_line'] }, // 22:00-09:00 Sun

  // Sunday (0) - Day shift is 09:00-22:00 (combined day+evening for 1st/2nd line)
  // Supervisor works 09:00 Sun to 08:00 Mon (23h continuous)
  { dayOfWeek: 0, shiftType: 'day', positions: ['supervisor', 'first_line', 'second_line'] },
  { dayOfWeek: 0, shiftType: 'night', positions: ['first_line'] }, // 22:00-08:00 Mon
];
