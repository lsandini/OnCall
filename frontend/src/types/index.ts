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
  startDate?: string; // Employment start date (YYYY-MM-DD)
  endDate?: string; // Employment end date (YYYY-MM-DD), undefined = ongoing
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

export interface Holiday {
  date: string;
  name: string;
  type: 'public' | 'custom';
  country: string;
}

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
