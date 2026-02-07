import { Worker, WeeklyAvailability, ShiftConfiguration, ShiftTypeDefinition, DailyShiftRequirement, LinePosition } from '../types/index.js';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Generate initial workers
export function createInitialWorkers(): Worker[] {
  const workers: Worker[] = [];

  // 10 Senior Specialists
  const seniorNames = [
    'Dr. Matti Virtanen', 'Dr. Johanna Korhonen', 'Dr. Antti Mäkinen',
    'Dr. Liisa Nieminen', 'Dr. Jukka Hämäläinen', 'Dr. Päivi Laine',
    'Dr. Timo Heikkinen', 'Dr. Sari Koskinen', 'Dr. Markku Järvinen',
    'Dr. Helena Lehtonen'
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

  // 8 Residents (permanent)
  const residentNames = [
    'Dr. Mikko Salonen', 'Dr. Elina Tuominen', 'Dr. Ville Lahtinen',
    'Dr. Katri Ahonen', 'Dr. Juha Leppänen', 'Dr. Riikka Hiltunen',
    'Dr. Petri Karjalainen', 'Dr. Outi Manninen'
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

  // 8 Students (permanent)
  const studentNames = [
    { name: 'Lauri Rantanen', year: 6 },
    { name: 'Aino Kallio', year: 6 },
    { name: 'Eero Salminen', year: 5 },
    { name: 'Nea Väisänen', year: 5 },
    { name: 'Oskari Mattila', year: 5 },
    { name: 'Veera Hakala', year: 4 },
    { name: 'Akseli Nurmi', year: 4 },
    { name: 'Iida Ojala', year: 4 }
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

  // 2 External workers
  const externals = [
    { name: 'Dr. Samuli Ketonen', role: 'resident' as const, year: undefined },
    { name: 'Roosa Peltola', role: 'student' as const, year: 5 }
  ];
  externals.forEach(({ name, role, year }) => {
    workers.push({
      id: generateId(),
      name,
      role,
      type: 'external',
      canDoubleSift: true,
      ...(year !== undefined && { yearOfStudy: year }),
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
