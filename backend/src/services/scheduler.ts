import {
  Worker,
  WeeklyAvailability,
  ShiftAssignment,
  MonthlySchedule,
  ShiftType,
  LinePosition,
  SHIFT_REQUIREMENTS,
  AvailabilityStatus
} from '../types/index.js';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Get all dates in a month
function getDatesInMonth(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

// Check worker availability for a specific shift
function getWorkerAvailability(
  worker: Worker,
  availability: WeeklyAvailability[],
  date: Date,
  shiftType: ShiftType
): AvailabilityStatus {
  const week = getWeekNumber(date);
  const day = date.getDay();
  const year = date.getFullYear();

  const entry = availability.find(a =>
    a.workerId === worker.id &&
    a.year === year &&
    a.week === week &&
    a.day === day &&
    a.shiftType === shiftType
  );

  return entry?.status || 'available'; // Default to available
}

// Check if worker can fill a position
function canFillPosition(worker: Worker, position: LinePosition): boolean {
  switch (position) {
    case 'supervisor':
      return worker.role === 'senior_specialist';
    case 'first_line':
      return worker.role === 'resident';
    case 'second_line':
      return worker.role === 'resident' || worker.role === 'student';
    case 'third_line':
      return worker.role === 'resident' || worker.role === 'student';
    default:
      return false;
  }
}

// Count shifts assigned to a worker in the current schedule
function countWorkerShifts(workerId: string, assignments: ShiftAssignment[]): number {
  return assignments.filter(a => a.workerId === workerId).length;
}

// Check if worker is already assigned on this date
function isWorkerAssignedOnDate(
  workerId: string,
  date: string,
  assignments: ShiftAssignment[]
): boolean {
  return assignments.some(a => a.workerId === workerId && a.date === date);
}

// Check if worker is assigned to a specific shift
function isWorkerAssignedToShift(
  workerId: string,
  date: string,
  shiftType: ShiftType,
  assignments: ShiftAssignment[]
): boolean {
  return assignments.some(
    a => a.workerId === workerId && a.date === date && a.shiftType === shiftType
  );
}

export function generateMonthlySchedule(
  year: number,
  month: number,
  workers: Worker[],
  availability: WeeklyAvailability[],
  existingSchedules: MonthlySchedule[]
): MonthlySchedule {
  const assignments: ShiftAssignment[] = [];
  const dates = getDatesInMonth(year, month);
  const activeWorkers = workers.filter(w => w.active);

  // Track shift counts for balancing
  const shiftCounts: Map<string, number> = new Map();
  activeWorkers.forEach(w => shiftCounts.set(w.id, 0));

  // Process each date
  for (const date of dates) {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    // Get requirements for this day
    const dayRequirements = SHIFT_REQUIREMENTS.filter(r => r.dayOfWeek === dayOfWeek);

    // Process each shift requirement
    for (const req of dayRequirements) {
      for (const position of req.positions) {
        // Get eligible workers for this position
        const eligibleWorkers = activeWorkers.filter(w => {
          if (!canFillPosition(w, position)) return false;
          if (isWorkerAssignedToShift(w.id, dateStr, req.shiftType, assignments)) return false;

          // For non-supervisor positions, avoid assigning same worker to multiple shifts same day
          // unless they're external and can do double shifts
          if (position !== 'supervisor') {
            const hasOtherShift = isWorkerAssignedOnDate(w.id, dateStr, assignments);
            if (hasOtherShift && !w.canDoubleSift) return false;
          }

          return true;
        });

        if (eligibleWorkers.length === 0) continue;

        // Score workers based on availability preference and balance
        const scoredWorkers = eligibleWorkers.map(w => {
          const avail = getWorkerAvailability(w, availability, date, req.shiftType);
          const currentShifts = shiftCounts.get(w.id) || 0;

          let score = 0;

          // Availability scoring
          if (avail === 'preferred') score += 100;
          else if (avail === 'available') score += 50;
          else if (avail === 'unavailable') score -= 1000; // Strong penalty

          // Balance scoring - prefer workers with fewer shifts
          score -= currentShifts * 10;

          // Slight preference for permanent staff over external
          if (w.type === 'permanent') score += 5;

          return { worker: w, score };
        });

        // Sort by score (descending) and pick the best
        scoredWorkers.sort((a, b) => b.score - a.score);

        const selected = scoredWorkers[0];
        if (selected && selected.score > -500) { // Don't assign if only unavailable workers
          assignments.push({
            id: generateId(),
            date: dateStr,
            shiftType: req.shiftType,
            position,
            workerId: selected.worker.id,
            isDoubleShift: false
          });

          shiftCounts.set(selected.worker.id, (shiftCounts.get(selected.worker.id) || 0) + 1);
        }
      }
    }
  }

  // Mark double shifts for externals who have evening + night on same day
  const workerDateShifts = new Map<string, ShiftAssignment[]>();
  assignments.forEach(a => {
    const key = `${a.workerId}-${a.date}`;
    if (!workerDateShifts.has(key)) workerDateShifts.set(key, []);
    workerDateShifts.get(key)!.push(a);
  });

  workerDateShifts.forEach((shifts, key) => {
    if (shifts.length >= 2) {
      const hasEvening = shifts.some(s => s.shiftType === 'evening');
      const hasNight = shifts.some(s => s.shiftType === 'night');
      if (hasEvening && hasNight) {
        shifts.forEach(s => s.isDoubleShift = true);
      }
    }
  });

  return {
    year,
    month,
    assignments,
    generatedAt: new Date().toISOString()
  };
}
