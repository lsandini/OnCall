import { useState, useMemo } from 'react';
import { Worker, MonthlySchedule, ShiftAssignment, ShiftType, LinePosition } from '../types';
import { useApi } from '../hooks/useApi';
import {
  MONTH_NAMES,
  DAY_NAMES_FULL,
  SHIFT_LABELS,
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

type ViewMode = 'calendar' | 'list';

export default function ScheduleTab({ workers, schedule, year, month, onScheduleChange }: Props) {
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [editingAssignment, setEditingAssignment] = useState<ShiftAssignment | null>(null);

  const api = useApi();

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
              {formatDate(assignment.date)} / {SHIFT_LABELS[assignment.shiftType]} / {POSITION_LABELS[assignment.position]}
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

  const DayCard = ({ date }: { date: Date }) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const assignments = assignmentsByDate.get(dateStr) || [];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const shiftOrder: ShiftType[] = ['day', 'evening', 'night'];
    const positionOrder: LinePosition[] = ['supervisor', 'first_line', 'second_line', 'third_line'];

    return (
      <div className={`card-sharp p-3 ${isWeekend ? 'bg-amber-50/50' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-semibold text-steel-500 uppercase">
              {DAY_NAMES_FULL[dayOfWeek]}
            </div>
            <div className="text-lg font-bold font-mono text-steel-900">
              {date.getDate()}
            </div>
          </div>
          {isWeekend && (
            <span className="badge bg-amber-100 border-amber-300 text-amber-700">Weekend</span>
          )}
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
                    {SHIFT_LABELS[shift]}
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
            <div className="text-2xl font-bold font-mono text-rose-600">{roleStats.senior}</div>
            <div className="text-xs text-steel-500 uppercase">Supervisor</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-sky-600">{roleStats.resident}</div>
            <div className="text-xs text-steel-500 uppercase">Resident</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-600">{roleStats.student}</div>
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
              className={`px-4 py-2 text-sm font-semibold ${
                viewMode === 'calendar' ? 'bg-clinic-500 text-white' : 'text-steel-600 hover:bg-steel-50'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-semibold border-l-2 border-steel-200 ${
                viewMode === 'list' ? 'bg-clinic-500 text-white' : 'text-steel-600 hover:bg-steel-50'
              }`}
            >
              Stats
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
            {/* Day headers */}
            {DAY_NAMES_FULL.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-steel-500 uppercase py-2">
                {day}
              </div>
            ))}

            {/* Empty cells for offset */}
            {Array.from({ length: datesInMonth[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Date cards */}
            {datesInMonth.map(date => (
              <DayCard key={date.toISOString()} date={date} />
            ))}
          </div>
        </>
      ) : (
        <>
          <StatsPanel />
          <h3 className="text-sm font-bold text-steel-700 uppercase tracking-wide mb-4">
            Worker Load Distribution
          </h3>
          <WorkerLoadTable />
        </>
      )}

      {editingAssignment && <EligibleWorkerSelector assignment={editingAssignment} />}
    </div>
  );
}
