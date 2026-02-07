import {
  Worker,
  WeeklyAvailability,
  ShiftAssignment,
  MonthlySchedule,
  ShiftType,
  LinePosition,
  ShiftConfiguration,
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

// Check if worker is employed on a specific date
function isWorkerEmployedOnDate(worker: Worker, date: Date): boolean {
  // If no start date, assume always employed
  const startDate = worker.startDate ? new Date(worker.startDate) : new Date(0);
  // If no end date, assume ongoing
  const endDate = worker.endDate ? new Date(worker.endDate) : new Date(9999, 11, 31);

  return date >= startDate && date <= endDate;
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

// Format date as YYYY-MM-DD
function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Check if worker was assigned on the previous weekend (Sat/Sun 7 days back)
function workedPreviousWeekend(
  workerId: string,
  date: Date,
  currentAssignments: ShiftAssignment[],
  previousMonthAssignments: ShiftAssignment[]
): boolean {
  const dayOfWeek = date.getDay();
  if (dayOfWeek !== 0 && dayOfWeek !== 6) return false;

  // Find the Saturday of the current weekend
  const currentSat = new Date(date);
  if (dayOfWeek === 0) currentSat.setDate(currentSat.getDate() - 1);

  // Previous weekend's Saturday and Sunday
  const prevSat = new Date(currentSat);
  prevSat.setDate(prevSat.getDate() - 7);
  const prevSun = new Date(prevSat);
  prevSun.setDate(prevSun.getDate() + 1);

  const prevSatStr = formatDateStr(prevSat);
  const prevSunStr = formatDateStr(prevSun);

  const allAssignments = [...currentAssignments, ...previousMonthAssignments];
  return allAssignments.some(a =>
    a.workerId === workerId && (a.date === prevSatStr || a.date === prevSunStr)
  );
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
  existingSchedules: MonthlySchedule[],
  configuration?: ShiftConfiguration,
  holidays?: { date: string; name: string }[]
): MonthlySchedule {
  const assignments: ShiftAssignment[] = [];
  const dates = getDatesInMonth(year, month);
  const activeWorkers = workers.filter(w => w.active);

  // Track shift counts for balancing
  const shiftCounts: Map<string, number> = new Map();
  activeWorkers.forEach(w => shiftCounts.set(w.id, 0));

  // Get previous month's assignments for consecutive weekend check
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevSchedule = existingSchedules.find(s => s.year === prevYear && s.month === prevMonth);
  const previousMonthAssignments = prevSchedule?.assignments || [];

  // Use configuration's daily requirements if provided
  const dailyRequirements = configuration?.dailyRequirements || [];

  // Process each date
  for (const date of dates) {
    const dayOfWeek = date.getDay();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // Treat holidays as Sundays for scheduling purposes
    const isHoliday = holidays?.some(h => h.date === dateStr);
    const effectiveDayOfWeek = isHoliday ? 0 : dayOfWeek;

    // Get requirements for this day from configuration
    const dayRequirements = dailyRequirements.filter(r => r.dayOfWeek === effectiveDayOfWeek);

    // Process each shift requirement
    for (const req of dayRequirements) {
      // Convert shiftTypeId to ShiftType (they match: 'day', 'evening', 'night')
      const shiftType = req.shiftTypeId as ShiftType;

      for (const position of req.positions) {
        // Get eligible workers for this position
        const eligibleWorkers = activeWorkers.filter(w => {
          if (!isWorkerEmployedOnDate(w, date)) return false;
          if (!canFillPosition(w, position)) return false;
          if (isWorkerAssignedToShift(w.id, dateStr, shiftType, assignments)) return false;

          // For non-supervisor positions, avoid assigning same worker to multiple shifts same day
          // unless they're external and can do double shifts
          if (position !== 'supervisor') {
            const hasOtherShift = isWorkerAssignedOnDate(w.id, dateStr, assignments);
            if (hasOtherShift && !w.canDoubleSift) return false;
          }

          // No consecutive weekends unless worker marked preferred
          if (workedPreviousWeekend(w.id, date, assignments, previousMonthAssignments)) {
            const avail = getWorkerAvailability(w, availability, date, shiftType);
            if (avail !== 'preferred') return false;
          }

          return true;
        });

        if (eligibleWorkers.length === 0) continue;

        // Score workers based on availability preference and balance
        const scoredWorkers = eligibleWorkers.map(w => {
          const avail = getWorkerAvailability(w, availability, date, shiftType);
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

        // Sort by score (descending), shuffling ties randomly
        scoredWorkers.sort((a, b) => b.score - a.score || Math.random() - 0.5);

        const selected = scoredWorkers[0];
        if (selected && selected.score > -500) { // Don't assign if only unavailable workers
          assignments.push({
            id: generateId(),
            date: dateStr,
            shiftType,
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

export function fillScheduleGaps(
  year: number,
  month: number,
  existingAssignments: ShiftAssignment[],
  workers: Worker[],
  availability: WeeklyAvailability[],
  configuration?: ShiftConfiguration,
  holidays?: { date: string; name: string }[],
  previousMonthAssignments?: ShiftAssignment[]
): MonthlySchedule {
  const prevAssignments = previousMonthAssignments || [];
  const dates = getDatesInMonth(year, month);
  const activeWorkers = workers.filter(w => w.active);
  const dailyRequirements = configuration?.dailyRequirements || [];

  // Step 1: Remove assignments where the worker is now unavailable
  const keptAssignments = existingAssignments.filter(a => {
    const worker = activeWorkers.find(w => w.id === a.workerId);
    if (!worker) return false; // worker deactivated — remove assignment
    const [y, m, d] = a.date.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const avail = getWorkerAvailability(worker, availability, date, a.shiftType);
    return avail !== 'unavailable';
  });

  // Step 2: Initialize shift counts from kept assignments
  const shiftCounts: Map<string, number> = new Map();
  activeWorkers.forEach(w => shiftCounts.set(w.id, 0));
  keptAssignments.forEach(a => {
    shiftCounts.set(a.workerId, (shiftCounts.get(a.workerId) || 0) + 1);
  });

  // Step 3: Build a set of already-filled (date, shiftType, position) slots
  const filledSlots = new Set(
    keptAssignments.map(a => `${a.date}|${a.shiftType}|${a.position}`)
  );

  // Step 4: Walk every required slot and fill gaps
  const newAssignments: ShiftAssignment[] = [];
  // Combine kept + new so constraint checks (same-day, same-shift) see everything
  const allAssignments = [...keptAssignments];

  for (const date of dates) {
    const dayOfWeek = date.getDay();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const isHoliday = holidays?.some(h => h.date === dateStr);
    const effectiveDayOfWeek = isHoliday ? 0 : dayOfWeek;

    const dayRequirements = dailyRequirements.filter(r => r.dayOfWeek === effectiveDayOfWeek);

    for (const req of dayRequirements) {
      const shiftType = req.shiftTypeId as ShiftType;

      for (const position of req.positions) {
        const slotKey = `${dateStr}|${shiftType}|${position}`;
        if (filledSlots.has(slotKey)) continue; // already assigned — skip

        // Same eligibility logic as generateMonthlySchedule
        const eligibleWorkers = activeWorkers.filter(w => {
          if (!isWorkerEmployedOnDate(w, date)) return false;
          if (!canFillPosition(w, position)) return false;
          if (isWorkerAssignedToShift(w.id, dateStr, shiftType, allAssignments)) return false;

          if (position !== 'supervisor') {
            const hasOtherShift = isWorkerAssignedOnDate(w.id, dateStr, allAssignments);
            if (hasOtherShift && !w.canDoubleSift) return false;
          }

          // No consecutive weekends unless worker marked preferred
          if (workedPreviousWeekend(w.id, date, allAssignments, prevAssignments)) {
            const avail = getWorkerAvailability(w, availability, date, shiftType);
            if (avail !== 'preferred') return false;
          }

          return true;
        });

        if (eligibleWorkers.length === 0) continue;

        const scoredWorkers = eligibleWorkers.map(w => {
          const avail = getWorkerAvailability(w, availability, date, shiftType);
          const currentShifts = shiftCounts.get(w.id) || 0;

          let score = 0;
          if (avail === 'preferred') score += 100;
          else if (avail === 'available') score += 50;
          else if (avail === 'unavailable') score -= 1000;

          score -= currentShifts * 10;
          if (w.type === 'permanent') score += 5;

          return { worker: w, score };
        });

        scoredWorkers.sort((a, b) => b.score - a.score || Math.random() - 0.5);

        const selected = scoredWorkers[0];
        if (selected && selected.score > -500) {
          const assignment: ShiftAssignment = {
            id: generateId(),
            date: dateStr,
            shiftType,
            position,
            workerId: selected.worker.id,
            isDoubleShift: false
          };
          newAssignments.push(assignment);
          allAssignments.push(assignment);
          shiftCounts.set(selected.worker.id, (shiftCounts.get(selected.worker.id) || 0) + 1);
        }
      }
    }
  }

  // Step 5: Merge and mark double shifts
  const merged = [...keptAssignments, ...newAssignments];

  const workerDateShifts = new Map<string, ShiftAssignment[]>();
  merged.forEach(a => {
    const key = `${a.workerId}-${a.date}`;
    if (!workerDateShifts.has(key)) workerDateShifts.set(key, []);
    workerDateShifts.get(key)!.push(a);
  });

  workerDateShifts.forEach((shifts) => {
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
    assignments: merged,
    generatedAt: new Date().toISOString()
  };
}
