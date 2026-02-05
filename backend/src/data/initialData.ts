import { Worker, WeeklyAvailability, ShiftConfiguration, ShiftTypeDefinition, DailyShiftRequirement, LinePosition } from '../types/index.js';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Generate initial workers
export function createInitialWorkers(): Worker[] {
  const workers: Worker[] = [];

  // 15 Senior Specialists
  const seniorNames = [
    'Dr. Sarah Mitchell', 'Dr. James Cooper', 'Dr. Emily Watson',
    'Dr. Michael Chen', 'Dr. Rachel Foster', 'Dr. David Park',
    'Dr. Laura Bennett', 'Dr. Steven Clark', 'Dr. Maria Santos',
    'Dr. Andrew Walsh', 'Dr. Jennifer Cole', 'Dr. Robert Hayes',
    'Dr. Susan Miller', 'Dr. Paul Robinson', 'Dr. Karen Fisher'
  ];
  seniorNames.forEach(name => {
    workers.push({
      id: generateId(),
      name,
      role: 'senior_specialist',
      type: 'permanent',
      canDoubleSift: false,
      active: true,
      createdAt: new Date().toISOString()
    });
  });

  // 10 Residents (permanent)
  const residentNames = [
    'Dr. Matt Reynolds', 'Dr. Sara Kim', 'Dr. Daniel Brooks',
    'Dr. Anna Patel', 'Dr. Luke Harrison', 'Dr. Emma Carter',
    'Dr. Fred Marshall', 'Dr. Lisa Torres', 'Dr. Simon Gray',
    'Dr. Alice Murphy'
  ];
  residentNames.forEach(name => {
    workers.push({
      id: generateId(),
      name,
      role: 'resident',
      type: 'permanent',
      canDoubleSift: false,
      active: true,
      createdAt: new Date().toISOString()
    });
  });

  // 10 Students (permanent)
  const studentNames = [
    { name: 'Mark Evans', year: 6 },
    { name: 'Julia Reed', year: 6 },
    { name: 'Andy Shaw', year: 5 },
    { name: 'Claire Young', year: 5 },
    { name: 'Frank West', year: 5 },
    { name: 'Martha Jordan', year: 4 },
    { name: 'Tom Russell', year: 4 },
    { name: 'Sophie Lane', year: 4 },
    { name: 'Logan Scott', year: 6 },
    { name: 'Beth Murray', year: 5 }
  ];
  studentNames.forEach(({ name, year }) => {
    workers.push({
      id: generateId(),
      name,
      role: 'student',
      type: 'permanent',
      canDoubleSift: false,
      yearOfStudy: year,
      active: true,
      createdAt: new Date().toISOString()
    });
  });

  // 1 External Resident
  workers.push({
    id: generateId(),
    name: 'Dr. Pete Valentine',
    role: 'resident',
    type: 'external',
    canDoubleSift: true,
    active: true,
    createdAt: new Date().toISOString()
  });

  // 3 External Students
  const externalStudents = [
    { name: 'Ellie Morgan', year: 6 },
    { name: 'Nick Palmer', year: 5 },
    { name: 'Alex Grant', year: 5 }
  ];
  externalStudents.forEach(({ name, year }) => {
    workers.push({
      id: generateId(),
      name,
      role: 'student',
      type: 'external',
      canDoubleSift: true,
      yearOfStudy: year,
      active: true,
      createdAt: new Date().toISOString()
    });
  });

  return workers;
}

export function createInitialAvailability(): WeeklyAvailability[] {
  // Start with empty availability - workers are available by default
  return [];
}

// Create default shift configuration for Internal Medicine
export function createDefaultShiftConfiguration(): ShiftConfiguration {
  const now = new Date().toISOString();

  const shiftTypes: ShiftTypeDefinition[] = [
    {
      id: 'day',
      name: 'Day',
      startTime: '09:00',
      endTime: '22:00',
      crossesMidnight: false
    },
    {
      id: 'evening',
      name: 'Evening',
      startTime: '15:00',
      endTime: '22:00',
      crossesMidnight: false
    },
    {
      id: 'night',
      name: 'Night',
      startTime: '22:00',
      endTime: '08:00',
      crossesMidnight: true
    }
  ];

  const dailyRequirements: DailyShiftRequirement[] = [
    // Sunday (0) - Weekend: Day + Night
    { dayOfWeek: 0, shiftTypeId: 'day', positions: ['supervisor', 'first_line', 'second_line'] },
    { dayOfWeek: 0, shiftTypeId: 'night', positions: ['first_line'] },

    // Monday (1) - Weekday: Evening + Night (with 3rd line)
    { dayOfWeek: 1, shiftTypeId: 'evening', positions: ['supervisor', 'first_line', 'second_line', 'third_line'] },
    { dayOfWeek: 1, shiftTypeId: 'night', positions: ['first_line'] },

    // Tuesday (2) - Weekday: Evening + Night
    { dayOfWeek: 2, shiftTypeId: 'evening', positions: ['supervisor', 'first_line', 'second_line'] },
    { dayOfWeek: 2, shiftTypeId: 'night', positions: ['first_line'] },

    // Wednesday (3) - Weekday: Evening + Night
    { dayOfWeek: 3, shiftTypeId: 'evening', positions: ['supervisor', 'first_line', 'second_line'] },
    { dayOfWeek: 3, shiftTypeId: 'night', positions: ['first_line'] },

    // Thursday (4) - Weekday: Evening + Night
    { dayOfWeek: 4, shiftTypeId: 'evening', positions: ['supervisor', 'first_line', 'second_line'] },
    { dayOfWeek: 4, shiftTypeId: 'night', positions: ['first_line'] },

    // Friday (5) - Weekday: Evening + Night (with 3rd line)
    { dayOfWeek: 5, shiftTypeId: 'evening', positions: ['supervisor', 'first_line', 'second_line', 'third_line'] },
    { dayOfWeek: 5, shiftTypeId: 'night', positions: ['first_line'] },

    // Saturday (6) - Weekend: Day + Night
    { dayOfWeek: 6, shiftTypeId: 'day', positions: ['supervisor', 'first_line', 'second_line'] },
    { dayOfWeek: 6, shiftTypeId: 'night', positions: ['first_line'] }
  ];

  return {
    id: generateId(),
    name: 'Internal Medicine',
    description: 'Default shift configuration for Internal Medicine clinic',
    shiftTypes,
    dailyRequirements,
    createdAt: now,
    updatedAt: now,
    isActive: true
  };
}
