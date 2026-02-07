import { randomUUID } from 'crypto';
import { Worker, WeeklyAvailability, ShiftConfiguration, ShiftTypeDefinition, DailyShiftRequirement, LinePosition } from '../types/index.js';

function generateId(): string {
  return randomUUID();
}

// Generate initial workers
export function createInitialWorkers(clinicId: string): Worker[] {
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
      canDoubleShift: false,
      active: true,
      clinicId,
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
      canDoubleShift: false,
      active: true,
      clinicId,
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
      canDoubleShift: false,
      yearOfStudy: year,
      active: true,
      clinicId,
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
      canDoubleShift: true,
      ...(year !== undefined && { yearOfStudy: year }),
      active: true,
      clinicId,
      createdAt: new Date().toISOString()
    });
  });

  return workers;
}

// Generate surgery workers
export function createSurgeryWorkers(clinicId: string): Worker[] {
  const workers: Worker[] = [];

  // 8 Senior Specialists (surgeons)
  const seniorNames = [
    'Dr. Kari Lindström', 'Dr. Tuula Rantala', 'Dr. Pekka Toivonen',
    'Dr. Merja Laaksonen', 'Dr. Jari Aaltonen', 'Dr. Kirsi Nurmi',
    'Dr. Hannu Saarinen', 'Dr. Ulla Peltonen'
  ];
  seniorNames.forEach(name => {
    workers.push({
      id: generateId(),
      name,
      role: 'senior_specialist',
      type: 'permanent',
      canDoubleShift: false,
      active: true,
      clinicId,
      createdAt: new Date().toISOString()
    });
  });

  // 6 Residents
  const residentNames = [
    'Dr. Tommi Heikkilä', 'Dr. Sanna Virtanen', 'Dr. Antti Koivisto',
    'Dr. Laura Mäkelä', 'Dr. Teemu Valtonen', 'Dr. Jenni Kinnunen'
  ];
  residentNames.forEach(name => {
    workers.push({
      id: generateId(),
      name,
      role: 'resident',
      type: 'permanent',
      canDoubleShift: false,
      active: true,
      clinicId,
      createdAt: new Date().toISOString()
    });
  });

  // 6 Students
  const studentNames = [
    { name: 'Matias Laitinen', year: 6 },
    { name: 'Emilia Repo', year: 6 },
    { name: 'Niklas Havu', year: 5 },
    { name: 'Saara Kivimäki', year: 5 },
    { name: 'Joona Partanen', year: 4 },
    { name: 'Ella Tuominen', year: 4 }
  ];
  studentNames.forEach(({ name, year }) => {
    workers.push({
      id: generateId(),
      name,
      role: 'student',
      type: 'permanent',
      canDoubleShift: false,
      yearOfStudy: year,
      active: true,
      clinicId,
      createdAt: new Date().toISOString()
    });
  });

  // 2 External workers
  const externals = [
    { name: 'Dr. Riku Seppälä', role: 'resident' as const, year: undefined },
    { name: 'Anni Lähteenmäki', role: 'student' as const, year: 5 }
  ];
  externals.forEach(({ name, role, year }) => {
    workers.push({
      id: generateId(),
      name,
      role,
      type: 'external',
      canDoubleShift: true,
      ...(year !== undefined && { yearOfStudy: year }),
      active: true,
      clinicId,
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
export function createDefaultShiftConfiguration(clinicId: string): ShiftConfiguration {
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
    isActive: true,
    clinicId,
  };
}

// Create default shift configuration for Surgery (same structure as Internal Medicine)
export function createSurgeryShiftConfiguration(clinicId: string): ShiftConfiguration {
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
    name: 'Surgery',
    description: 'Default shift configuration for Surgery clinic',
    shiftTypes,
    dailyRequirements,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    clinicId,
  };
}
