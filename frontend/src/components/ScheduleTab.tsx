import { useState, useMemo, useEffect } from 'react';
import { Worker, MonthlySchedule, ShiftAssignment, ShiftType, LinePosition, Holiday, ShiftConfiguration } from '../types';
import { useApi } from '../hooks/useApi';
import {
  MONTH_NAMES,
  DAY_NAMES_FULL,
  POSITION_LABELS,
  SHIFT_COLORS,
  POSITION_COLORS,
  formatDate
} from '../utils/helpers';

interface Props {
  workers: Worker[];
  schedule: MonthlySchedule | undefined;
  year: number;
  month: number;
  onScheduleChange: () => void;
}

type ViewMode = 'calendar' | 'list' | 'distribution';

// Timezone-safe YYYY-MM-DD formatter (avoids toISOString UTC shift)
function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ScheduleTab({ workers, schedule, year, month, onScheduleChange }: Props) {
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [editingAssignment, setEditingAssignment] = useState<ShiftAssignment | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [configuration, setConfiguration] = useState<ShiftConfiguration | null>(null);

  const api = useApi();

  useEffect(() => {
    api.getHolidays(year).then(setHolidays).catch(() => setHolidays([]));
  }, [year]);

  useEffect(() => {
    api.getConfiguration().then(setConfiguration).catch(() => {});
  }, []);

  // Build dynamic shift labels from configuration
  const shiftLabels = useMemo(() => {
    const fallback: Record<string, string> = { day: 'Day', evening: 'Evening', night: 'Night' };
    if (!configuration) return fallback;
    const labels: Record<string, string> = {};
    for (const st of configuration.shiftTypes) {
      const start = st.startTime.replace(/^0/, '');
      const end = st.endTime.replace(/^0/, '');
      labels[st.id] = `${st.name} (${start}-${end})`;
    }
    return labels;
  }, [configuration]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.generateSchedule(year, month);
      onScheduleChange();
    } catch (e) {
      alert('Failed to generate schedule');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateAssignment = async (assignmentId: string, workerId: string) => {
    try {
      await api.updateAssignment(year, month, assignmentId, workerId);
      onScheduleChange();
      setEditingAssignment(null);
    } catch (e) {
      alert('Failed to update assignment');
    }
  };

  const getWorker = (workerId: string) => workers.find(w => w.id === workerId);

  // Group assignments by date
  const assignmentsByDate = useMemo(() => {
    if (!schedule) return new Map<string, ShiftAssignment[]>();
    const map = new Map<string, ShiftAssignment[]>();
    schedule.assignments.forEach(a => {
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date)!.push(a);
    });
    return map;
  }, [schedule]);

  // Get dates in month
  const datesInMonth = useMemo(() => {
    const dates: Date[] = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    return dates;
  }, [year, month]);

  // Calculate worker stats
  const workerStats = useMemo(() => {
    if (!schedule) return new Map<string, number>();
    const stats = new Map<string, number>();
    schedule.assignments.forEach(a => {
      stats.set(a.workerId, (stats.get(a.workerId) || 0) + 1);
    });
    return stats;
  }, [schedule]);

  const EligibleWorkerSelector = ({ assignment }: { assignment: ShiftAssignment }) => {
    const eligible = workers.filter(w => {
      if (!w.active) return false;
      switch (assignment.position) {
        case 'supervisor': return w.role === 'senior_specialist';
        case 'first_line': return w.role === 'resident';
        case 'second_line':
        case 'third_line': return w.role === 'resident' || w.role === 'student';
        default: return false;
      }
    });

    return (
      <div className="fixed inset-0 bg-steel-900/50 flex items-center justify-center z-50">
        <div className="bg-white border-2 border-steel-200 shadow-sharp-lg w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-steel-200">
            <h3 className="font-bold text-steel-900">Change Assignment</h3>
            <p className="text-sm text-steel-500 font-mono">
              {formatDate(assignment.date)} / {shiftLabels[assignment.shiftType]} / {POSITION_LABELS[assignment.position]}
            </p>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {eligible.map(w => (
              <button
                key={w.id}
                onClick={() => handleUpdateAssignment(assignment.id, w.id)}
                className={`w-full text-left px-4 py-3 mb-2 border-2 transition-colors ${
                  w.id === assignment.workerId
                    ? 'border-clinic-500 bg-clinic-50'
                    : 'border-steel-200 hover:bg-steel-50'
                }`}
              >
                <div className="font-medium text-steel-900">{w.name}</div>
                <div className="text-xs text-steel-500 font-mono">
                  {workerStats.get(w.id) || 0} shifts this month
                </div>
              </button>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-steel-200">
            <button
              onClick={() => setEditingAssignment(null)}
              className="w-full px-4 py-2 border-2 border-steel-200 font-semibold hover:bg-steel-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getHolidayForDate = (dateStr: string): Holiday | undefined => {
    return holidays.find(h => h.date === dateStr);
  };

  const DayCard = ({ date }: { date: Date }) => {
    const dateStr = toDateStr(date);
    const dayOfWeek = date.getDay();
    const assignments = assignmentsByDate.get(dateStr) || [];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const holiday = getHolidayForDate(dateStr);

    const shiftOrder: ShiftType[] = ['day', 'evening', 'night'];
    const positionOrder: LinePosition[] = ['supervisor', 'first_line', 'second_line', 'third_line'];

    return (
      <div className={`card-sharp p-3 ${holiday ? 'bg-clay-50/60 border-clay-200' : isWeekend ? 'bg-clay-50/30' : ''}`}>
        <div className="mb-3">
          <div className="text-xs font-semibold text-steel-500 uppercase">
            {DAY_NAMES_FULL[dayOfWeek]}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold font-mono text-steel-900 shrink-0">
              {date.getDate()}
            </span>
            {holiday ? (
              <span className="text-[10px] font-semibold text-clay-700 bg-clay-100 border border-clay-300 px-1.5 py-0.5 truncate max-w-full" title={holiday.name}>
                {holiday.name}
              </span>
            ) : isWeekend ? (
              <span className="badge bg-clay-100 border-clay-300 text-clay-600">Weekend</span>
            ) : null}
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="text-xs text-steel-400 italic">No shifts</div>
        ) : (
          <div className="space-y-2">
            {shiftOrder.map(shift => {
              const shiftAssignments = assignments
                .filter(a => a.shiftType === shift)
                .sort((a, b) => positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position));

              if (shiftAssignments.length === 0) return null;

              return (
                <div key={shift} className={`p-2 border ${SHIFT_COLORS[shift]}`}>
                  <div className="text-xs font-semibold uppercase mb-1">
                    {shiftLabels[shift]}
                  </div>
                  <div className="space-y-1">
                    {shiftAssignments.map(a => {
                      const worker = getWorker(a.workerId);
                      return (
                        <button
                          key={a.id}
                          onClick={() => setEditingAssignment(a)}
                          className={`w-full text-left px-2 py-1 text-xs border ${POSITION_COLORS[a.position]} hover:opacity-80 transition-opacity`}
                        >
                          <span className="font-semibold">{POSITION_LABELS[a.position]}:</span>{' '}
                          <span className="font-mono">
                            {worker?.name.split(' ').slice(-1)[0]}
                            {worker?.type === 'external' && ' (EXT)'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const StatsPanel = () => {
    const roleStats = useMemo(() => {
      const stats = { senior: 0, resident: 0, student: 0 };
      workerStats.forEach((count, workerId) => {
        const worker = getWorker(workerId);
        if (!worker) return;
        if (worker.role === 'senior_specialist') stats.senior += count;
        else if (worker.role === 'resident') stats.resident += count;
        else stats.student += count;
      });
      return stats;
    }, [workerStats]);

    return (
      <div className="card-sharp p-4 mb-6">
        <h3 className="text-sm font-bold text-steel-700 uppercase tracking-wide mb-4">
          Distribution Summary
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold font-mono text-clay-600">{roleStats.senior}</div>
            <div className="text-xs text-steel-500 uppercase">Supervisor</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-steel-500">{roleStats.resident}</div>
            <div className="text-xs text-steel-500 uppercase">Resident</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-clinic-600">{roleStats.student}</div>
            <div className="text-xs text-steel-500 uppercase">Student</div>
          </div>
        </div>
      </div>
    );
  };

  const WorkerLoadTable = () => {
    const sortedWorkers = [...workers]
      .filter(w => w.active && workerStats.has(w.id))
      .sort((a, b) => (workerStats.get(b.id) || 0) - (workerStats.get(a.id) || 0));

    return (
      <div className="card-sharp overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-steel-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-steel-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-steel-600 uppercase">Role</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-steel-600 uppercase">Shifts</th>
            </tr>
          </thead>
          <tbody>
            {sortedWorkers.map(w => (
              <tr key={w.id} className="border-t border-steel-100 hover:bg-steel-50">
                <td className="px-4 py-3 font-medium text-steel-900">{w.name}</td>
                <td className="px-4 py-3 text-sm text-steel-500 font-mono uppercase">{w.role.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono font-bold text-clinic-600">{workerStats.get(w.id) || 0}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const DistributionLists = () => {
    if (!schedule) return null;

    const formatDateShort = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const day = date.getDate();
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      return `${weekday} ${day}`;
    };

    const getWorkerName = (workerId: string) => {
      const worker = getWorker(workerId);
      if (!worker) return '-';
      // Return last name only for compactness
      const parts = worker.name.split(' ');
      const lastName = parts[parts.length - 1];
      return worker.type === 'external' ? `${lastName}*` : lastName;
    };

    // Get the main (non-night) assignment for a position on a date
    const getMainAssignment = (dateStr: string, position: LinePosition) => {
      return schedule.assignments.find(
        a => a.date === dateStr && a.shiftType !== 'night' && a.position === position
      );
    };

    // Get night assignment for a position on a date
    const getNightAssignment = (dateStr: string, position: LinePosition) => {
      return schedule.assignments.find(
        a => a.date === dateStr && a.shiftType === 'night' && a.position === position
      );
    };

    // Determine if a day is weekend
    const isWeekend = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      return dow === 0 || dow === 6;
    };

    const isHolidayDate = (dateStr: string) => holidays.some(h => h.date === dateStr);
    const getHolidayName = (dateStr: string) => holidays.find(h => h.date === dateStr)?.name;

    return (
      <div>
        <div className="flex items-center justify-between mb-6 print:hidden">
          <h3 className="text-lg font-bold text-steel-700">
            Monthly Schedule - {MONTH_NAMES[month - 1]} {year}
          </h3>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 border-2 border-steel-200 text-steel-600 font-semibold hover:bg-steel-50 transition-colors"
          >
            Print
          </button>
        </div>

        <div className="hidden print:block text-center mb-4">
          <h2 className="text-lg font-bold">On-Call Schedule - {MONTH_NAMES[month - 1]} {year}</h2>
        </div>

        <div className="card-sharp overflow-x-auto print:shadow-none print:border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-steel-100">
                <th className="px-2 py-2 text-left font-semibold text-steel-600 border-b border-steel-200">Date</th>
                <th className="px-2 py-2 text-center font-semibold text-steel-600 border-b border-l border-steel-200 bg-clay-50">Supervisor</th>
                <th className="px-2 py-2 text-center font-semibold text-steel-600 border-b border-l border-steel-200 bg-steel-100">1st Line</th>
                <th className="px-2 py-2 text-center font-semibold text-steel-600 border-b border-l border-steel-200 bg-clinic-50">2nd Line</th>
                <th className="px-2 py-2 text-center font-semibold text-steel-600 border-b border-l border-steel-200 bg-steel-50">3rd Line</th>
                <th className="px-2 py-2 text-center font-semibold text-steel-600 border-b border-l border-steel-200 bg-steel-200">Night</th>
              </tr>
            </thead>
            <tbody>
              {datesInMonth.map(date => {
                const dateStr = toDateStr(date);
                const weekend = isWeekend(dateStr);
                const holidayOnDate = isHolidayDate(dateStr);

                // Get assignments for this day (data-driven, not guessing shift type)
                const supervisor = getMainAssignment(dateStr, 'supervisor');
                const firstLine = getMainAssignment(dateStr, 'first_line');
                const secondLine = getMainAssignment(dateStr, 'second_line');
                const thirdLine = getMainAssignment(dateStr, 'third_line');
                const nightFirstLine = getNightAssignment(dateStr, 'first_line');

                const holidayName = getHolidayName(dateStr);

                return (
                  <tr key={dateStr} className={`border-b border-steel-100 ${holidayOnDate ? 'bg-clay-50/40' : weekend ? 'bg-clay-50/20' : ''}`}>
                    <td className="px-2 py-1.5 font-mono font-medium text-steel-700 whitespace-nowrap">
                      {formatDateShort(dateStr)}
                      {holidayOnDate && (
                        <span className="ml-1 text-[10px] text-clay-600 font-semibold" title={holidayName}>H</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center border-l border-steel-100">
                      {supervisor ? getWorkerName(supervisor.workerId) : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center border-l border-steel-100">
                      {firstLine ? getWorkerName(firstLine.workerId) : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center border-l border-steel-100">
                      {secondLine ? getWorkerName(secondLine.workerId) : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center border-l border-steel-100">
                      {thirdLine ? getWorkerName(thirdLine.workerId) : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center border-l border-steel-100 bg-steel-200/30">
                      {nightFirstLine ? getWorkerName(nightFirstLine.workerId) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-steel-400 mt-3 print:mt-2">
          * = External staff
        </p>
      </div>
    );
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          {schedule && (
            <p className="text-sm text-steel-500 font-mono">
              Generated: {new Date(schedule.generatedAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border-2 border-steel-200">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 text-sm font-semibold ${
                viewMode === 'calendar' ? 'bg-clinic-500 text-white' : 'text-steel-600 hover:bg-steel-50'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-semibold border-l-2 border-steel-200 ${
                viewMode === 'list' ? 'bg-clinic-500 text-white' : 'text-steel-600 hover:bg-steel-50'
              }`}
            >
              Stats
            </button>
            <button
              onClick={() => setViewMode('distribution')}
              className={`px-3 py-2 text-sm font-semibold border-l-2 border-steel-200 ${
                viewMode === 'distribution' ? 'bg-clinic-500 text-white' : 'text-steel-600 hover:bg-steel-50'
              }`}
            >
              Lists
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-clinic-500 text-white font-semibold hover:bg-clinic-600 transition-colors shadow-sharp disabled:opacity-50"
          >
            {generating ? 'Generating...' : schedule ? 'Regenerate' : 'Generate Schedule'}
          </button>
        </div>
      </div>

      {!schedule ? (
        <div className="card-sharp p-12 text-center">
          <div className="text-6xl mb-4 opacity-20">📅</div>
          <h3 className="text-xl font-bold text-steel-700 mb-2">No Schedule Yet</h3>
          <p className="text-steel-500 mb-6">
            Generate a schedule for {MONTH_NAMES[month - 1]} {year} to see shift assignments.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-3 bg-clinic-500 text-white font-semibold hover:bg-clinic-600 transition-colors shadow-sharp disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Schedule'}
          </button>
        </div>
      ) : viewMode === 'calendar' ? (
        <>
          <StatsPanel />
          <div className="grid grid-cols-7 gap-3">
            {/* Day headers (Monday-first) */}
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-steel-500 uppercase py-2">
                {day}
              </div>
            ))}

            {/* Empty cells for offset (Monday=0) */}
            {Array.from({ length: (datesInMonth[0].getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Date cards */}
            {datesInMonth.map(date => (
              <DayCard key={date.toISOString()} date={date} />
            ))}
          </div>
        </>
      ) : viewMode === 'list' ? (
        <>
          <StatsPanel />
          <h3 className="text-sm font-bold text-steel-700 uppercase tracking-wide mb-4">
            Worker Load Distribution
          </h3>
          <WorkerLoadTable />
        </>
      ) : (
        <DistributionLists />
      )}

      {editingAssignment && <EligibleWorkerSelector assignment={editingAssignment} />}
    </div>
  );
}
