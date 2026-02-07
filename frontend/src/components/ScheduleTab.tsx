import { useState, useMemo, useEffect } from 'react';
import { Worker, MonthlySchedule, ShiftAssignment, ShiftType, LinePosition, Holiday, ShiftConfiguration, WeeklyAvailability } from '../types';
import { useApi } from '../hooks/useApi';
import {
  getMonthNames,
  getDayNamesFull,
  getDayNames,
  getPositionLabels,
  getShiftName,
  SHIFT_COLORS,
  POSITION_COLORS,
  formatDate
} from '../utils/helpers';
import { useTranslation } from '../i18n';

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

// ISO week number (matches backend logic)
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default function ScheduleTab({ workers, schedule, year, month, onScheduleChange }: Props) {
  const [generating, setGenerating] = useState(false);
  const [fillingGaps, setFillingGaps] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [editingAssignment, setEditingAssignment] = useState<ShiftAssignment | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [configuration, setConfiguration] = useState<ShiftConfiguration | null>(null);
  const [availability, setAvailability] = useState<WeeklyAvailability[]>([]);
  const [prevMonthSchedule, setPrevMonthSchedule] = useState<MonthlySchedule | null>(null);
  const [nextMonthSchedule, setNextMonthSchedule] = useState<MonthlySchedule | null>(null);

  const api = useApi();
  const { t, locale, translations } = useTranslation();
  const monthNames = getMonthNames(translations);
  const dayNamesFull = getDayNamesFull(translations);
  const dayNamesShort = getDayNames(translations);
  const positionLabels = getPositionLabels(translations);

  useEffect(() => {
    api.getHolidays(year).then(setHolidays).catch(() => setHolidays([]));
  }, [year]);

  // Fetch adjacent months' schedules for overflow days
  useEffect(() => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    api.getSchedule(prevYear, prevMonth).then(setPrevMonthSchedule).catch(() => setPrevMonthSchedule(null));
    api.getSchedule(nextYear, nextMonth).then(setNextMonthSchedule).catch(() => setNextMonthSchedule(null));
  }, [year, month]);

  useEffect(() => {
    api.getConfiguration().then(setConfiguration).catch(() => {});
  }, []);

  useEffect(() => {
    api.getAvailability().then(setAvailability).catch(() => setAvailability([]));
  }, [schedule]);

  // Build dynamic shift labels from configuration
  const shiftLabels = useMemo(() => {
    const fallback: Record<string, string> = {
      day: translations.shifts.day,
      evening: translations.shifts.evening,
      night: translations.shifts.night,
    };
    if (!configuration) return fallback;
    const labels: Record<string, string> = {};
    for (const st of configuration.shiftTypes) {
      const start = st.startTime.replace(/^0/, '');
      const end = st.endTime.replace(/^0/, '');
      labels[st.id] = `${getShiftName(st.id, st.name, translations)} (${start}-${end})`;
    }
    return labels;
  }, [configuration, translations]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.generateSchedule(year, month);
      onScheduleChange();
    } catch (e) {
      alert(t('schedule.failedGenerate'));
    } finally {
      setGenerating(false);
    }
  };

  const handleFillGaps = async () => {
    setFillingGaps(true);
    try {
      await api.fillScheduleGaps(year, month);
      onScheduleChange();
    } catch (e) {
      alert(t('schedule.failedFillGaps'));
    } finally {
      setFillingGaps(false);
    }
  };

  const handleUpdateAssignment = async (assignmentId: string, workerId: string) => {
    try {
      await api.updateAssignment(year, month, assignmentId, workerId);
      onScheduleChange();
      setEditingAssignment(null);
    } catch (e) {
      alert(t('schedule.failedUpdate'));
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

  // Build overflow assignment map from adjacent months
  const overflowAssignmentsByDate = useMemo(() => {
    const map = new Map<string, ShiftAssignment[]>();
    const addAssignments = (schedule: MonthlySchedule | null) => {
      if (!schedule) return;
      schedule.assignments.forEach(a => {
        if (!map.has(a.date)) map.set(a.date, []);
        map.get(a.date)!.push(a);
      });
    };
    addAssignments(prevMonthSchedule);
    addAssignments(nextMonthSchedule);
    return map;
  }, [prevMonthSchedule, nextMonthSchedule]);

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

  // Compute leading overflow dates (last N days of previous month)
  const leadingOverflowDates = useMemo(() => {
    const offset = (datesInMonth[0].getDay() + 6) % 7;
    if (offset === 0) return [];
    const dates: Date[] = [];
    const lastDayPrevMonth = new Date(year, month - 1, 0); // day 0 of current month = last day of prev month
    for (let i = offset - 1; i >= 0; i--) {
      dates.push(new Date(lastDayPrevMonth.getFullYear(), lastDayPrevMonth.getMonth(), lastDayPrevMonth.getDate() - i));
    }
    return dates;
  }, [year, month, datesInMonth]);

  // Compute trailing overflow dates (first M days of next month to complete the row)
  const trailingOverflowDates = useMemo(() => {
    const offset = (datesInMonth[0].getDay() + 6) % 7;
    const totalCells = offset + datesInMonth.length;
    const trailing = (7 - (totalCells % 7)) % 7;
    if (trailing === 0) return [];
    const dates: Date[] = [];
    for (let i = 1; i <= trailing; i++) {
      dates.push(new Date(year, month, i)); // month is 0-indexed for Date, but here month is 1-based, so month = next month's 0-indexed
    }
    return dates;
  }, [year, month, datesInMonth]);

  // Calculate worker stats
  const workerStats = useMemo(() => {
    if (!schedule) return new Map<string, number>();
    const stats = new Map<string, number>();
    schedule.assignments.forEach(a => {
      stats.set(a.workerId, (stats.get(a.workerId) || 0) + 1);
    });
    return stats;
  }, [schedule]);

  // Detect assignments where the worker is now unavailable (gaps)
  const conflictedAssignmentIds = useMemo(() => {
    const ids = new Set<string>();
    if (!schedule || availability.length === 0) return ids;
    for (const a of schedule.assignments) {
      const [y, m, d] = a.date.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const week = getWeekNumber(date);
      const day = date.getDay();
      const entry = availability.find(av =>
        av.workerId === a.workerId &&
        av.year === y &&
        av.week === week &&
        av.day === day &&
        av.shiftType === a.shiftType
      );
      if (entry?.status === 'unavailable') {
        ids.add(a.id);
      }
    }
    return ids;
  }, [schedule, availability]);

  const gapCount = conflictedAssignmentIds.size;

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
            <h3 className="font-bold text-steel-900">{t('schedule.changeAssignment')}</h3>
            <p className="text-sm text-steel-500 font-mono">
              {formatDate(assignment.date, locale)} / {shiftLabels[assignment.shiftType]} / {positionLabels[assignment.position]}
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
                  {workerStats.get(w.id) || 0} {t('schedule.shiftsThisMonth')}
                </div>
              </button>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-steel-200">
            <button
              onClick={() => setEditingAssignment(null)}
              className="w-full px-4 py-2 border-2 border-steel-200 font-semibold hover:bg-steel-50"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getHolidayForDate = (dateStr: string): Holiday | undefined => {
    return holidays.find(h => h.date === dateStr);
  };

  const todayStr = toDateStr(new Date());

  // Monday-first day name headers for the calendar
  const calendarDayHeaders = useMemo(() => {
    const full = getDayNamesFull(translations);
    // Reorder from Sun-first [Sun,Mon,...,Sat] to Mon-first [Mon,...,Sun]
    return [...full.slice(1), full[0]];
  }, [translations]);

  const DayCard = ({ date, isOverflow, overflowAssignments }: { date: Date; isOverflow?: boolean; overflowAssignments?: ShiftAssignment[] }) => {
    const dateStr = toDateStr(date);
    const dayOfWeek = date.getDay();
    const assignments = isOverflow
      ? (overflowAssignments || [])
      : (assignmentsByDate.get(dateStr) || []);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const holiday = getHolidayForDate(dateStr);
    const isToday = dateStr === todayStr;

    const shiftOrder: ShiftType[] = ['day', 'evening', 'night'];
    const positionOrder: LinePosition[] = ['supervisor', 'first_line', 'second_line', 'third_line'];

    return (
      <div
        className={`card-sharp p-3 ${isOverflow ? 'opacity-40 pointer-events-none' : ''} ${holiday ? 'bg-clay-50/60 border-clay-200' : isWeekend ? 'bg-clay-50/30' : ''}`}
        style={isToday ? { borderLeft: '4px solid var(--color-clinic-500)', backgroundColor: 'var(--color-clinic-50)' } : undefined}
      >
        <div className="mb-3">
          <div className="text-xs font-semibold text-steel-500 uppercase">
            {dayNamesFull[dayOfWeek]}
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
              <span className="badge bg-clay-100 border-clay-300 text-clay-600">{t('common.weekend')}</span>
            ) : null}
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="text-xs text-steel-400 italic">{t('schedule.noShifts')}</div>
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
                      const isConflict = !isOverflow && conflictedAssignmentIds.has(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => !isOverflow && setEditingAssignment(a)}
                          className={`w-full text-left px-2 py-1 text-xs border ${isConflict ? 'border-red-500 bg-clay-50' : POSITION_COLORS[a.position]} hover:opacity-80 transition-opacity`}
                        >
                          <span className="font-semibold">{positionLabels[a.position]}:</span>{' '}
                          {isConflict ? (
                            <span className="font-mono text-clay-500 italic">{t('schedule.vacant')}</span>
                          ) : (
                            <span className="font-mono">
                              {worker?.name.split(' ').slice(-1)[0]}
                              {worker?.type === 'external' && ` (${t('workers.ext')})`}
                            </span>
                          )}
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


  const WorkerLoadTable = () => {
    const sortedWorkers = [...workers]
      .filter(w => w.active && workerStats.has(w.id))
      .sort((a, b) => (workerStats.get(b.id) || 0) - (workerStats.get(a.id) || 0));

    return (
      <div className="card-sharp overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-steel-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-steel-600 uppercase">{t('workers.name')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-steel-600 uppercase">{t('workers.role')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-steel-600 uppercase">{t('schedule.shifts_col')}</th>
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
      const weekday = dayNamesShort[date.getDay()];
      return `${weekday} ${day}`;
    };

    const getWorkerName = (workerId: string) => {
      const worker = getWorker(workerId);
      if (!worker) return '-';
      const parts = worker.name.split(' ');
      const lastName = parts[parts.length - 1];
      return worker.type === 'external' ? `${lastName}*` : lastName;
    };

    const renderCell = (assignment: ShiftAssignment | undefined) => {
      if (!assignment) return '-';
      if (conflictedAssignmentIds.has(assignment.id)) {
        return <span className="text-red-500 italic ring-1 ring-red-500 px-1 rounded-sm">{t('schedule.vacant')}</span>;
      }
      return getWorkerName(assignment.workerId);
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
            {t('schedule.monthlySchedule')} - {monthNames[month - 1]} {year}
          </h3>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 border-2 border-steel-200 text-steel-600 font-semibold hover:bg-steel-50 transition-colors"
          >
            {t('common.print')}
          </button>
        </div>

        <div className="hidden print:block text-center mb-4">
          <h2 className="text-lg font-bold">{t('schedule.onCallSchedule')} - {monthNames[month - 1]} {year}</h2>
        </div>

        <div className="card-sharp overflow-x-auto print:shadow-none print:border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-steel-100">
                <th className="px-2 py-2 text-left font-semibold text-steel-600 border-b border-steel-200">{t('schedule.date')}</th>
                <th className="px-2 py-2 text-center font-semibold text-steel-600 border-b border-l border-steel-200 bg-clay-50">{positionLabels.supervisor}</th>
                <th className="px-2 py-2 text-center font-semibold text-steel-600 border-b border-l border-steel-200 bg-steel-100">{positionLabels.first_line}</th>
                <th className="px-2 py-2 text-center font-semibold text-steel-600 border-b border-l border-steel-200 bg-clinic-50">{positionLabels.second_line}</th>
                <th className="px-2 py-2 text-center font-semibold text-steel-600 border-b border-l border-steel-200 bg-steel-50">{positionLabels.third_line}</th>
                <th className="px-2 py-2 text-center font-semibold text-steel-600 border-b border-l border-steel-200 bg-steel-200">{t('schedule.nightCol')}</th>
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
                  <tr key={dateStr} className={`border-b ${holidayOnDate ? 'bg-clay-100/60 border-clay-200' : weekend ? 'bg-clay-100/40 border-clay-200' : 'border-steel-100'}`}>
                    <td className={`px-2 py-1.5 font-mono font-medium whitespace-nowrap ${weekend || holidayOnDate ? 'text-clay-700' : 'text-steel-700'}`}>
                      {formatDateShort(dateStr)}
                      {holidayOnDate && (
                        <span className="ml-1 text-[10px] text-clay-600 font-semibold" title={holidayName}>H</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center border-l border-steel-100">
                      {renderCell(supervisor)}
                    </td>
                    <td className="px-2 py-1.5 text-center border-l border-steel-100">
                      {renderCell(firstLine)}
                    </td>
                    <td className="px-2 py-1.5 text-center border-l border-steel-100">
                      {renderCell(secondLine)}
                    </td>
                    <td className="px-2 py-1.5 text-center border-l border-steel-100">
                      {renderCell(thirdLine)}
                    </td>
                    <td className="px-2 py-1.5 text-center border-l border-steel-100 bg-steel-200/30">
                      {renderCell(nightFirstLine)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-steel-400 mt-3 print:mt-2">
          {t('schedule.externalStaff')}
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
            {monthNames[month - 1]} {year}
          </h2>
          {schedule && (
            <p className="text-sm text-steel-500 font-mono">
              {t('schedule.generated')}: {new Date(schedule.generatedAt).toLocaleString()}
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
              {t('schedule.calendar')}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-semibold border-l-2 border-steel-200 ${
                viewMode === 'list' ? 'bg-clinic-500 text-white' : 'text-steel-600 hover:bg-steel-50'
              }`}
            >
              {t('schedule.stats')}
            </button>
            <button
              onClick={() => setViewMode('distribution')}
              className={`px-3 py-2 text-sm font-semibold border-l-2 border-steel-200 ${
                viewMode === 'distribution' ? 'bg-clinic-500 text-white' : 'text-steel-600 hover:bg-steel-50'
              }`}
            >
              {t('schedule.lists')}
            </button>
          </div>

          {schedule && gapCount > 0 && (
            <button
              onClick={handleFillGaps}
              disabled={fillingGaps}
              className="px-4 py-2 border-2 border-clay-400 text-clay-700 font-semibold hover:bg-clay-50 transition-colors disabled:opacity-50"
            >
              {fillingGaps ? t('schedule.filling') : `${t('schedule.fillGaps')} (${gapCount})`}
            </button>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-clinic-500 text-white font-semibold hover:bg-clinic-600 transition-colors shadow-sharp disabled:opacity-50"
          >
            {generating ? t('schedule.generating') : schedule ? t('schedule.regenerate') : t('schedule.generate')}
          </button>
        </div>
      </div>

      {!schedule ? (
        <div className="card-sharp p-12 text-center">
          <div className="text-6xl mb-4 opacity-20">📅</div>
          <h3 className="text-xl font-bold text-steel-700 mb-2">{t('schedule.noScheduleYet')}</h3>
          <p className="text-steel-500 mb-6">
            {t('schedule.noScheduleDesc')}
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-3 bg-clinic-500 text-white font-semibold hover:bg-clinic-600 transition-colors shadow-sharp disabled:opacity-50"
          >
            {generating ? t('schedule.generating') : t('schedule.generate')}
          </button>
        </div>
      ) : viewMode === 'calendar' ? (
        <>

          <div className="grid grid-cols-7 gap-3">
            {/* Day headers (Monday-first) */}
            {calendarDayHeaders.map((day, i) => (
              <div key={i} className="text-center text-xs font-semibold text-steel-500 uppercase py-2">
                {day}
              </div>
            ))}

            {/* Leading overflow days from previous month */}
            {leadingOverflowDates.map(date => (
              <DayCard
                key={`overflow-prev-${toDateStr(date)}`}
                date={date}
                isOverflow
                overflowAssignments={overflowAssignmentsByDate.get(toDateStr(date))}
              />
            ))}

            {/* Date cards */}
            {datesInMonth.map(date => (
              <DayCard key={date.toISOString()} date={date} />
            ))}

            {/* Trailing overflow days from next month */}
            {trailingOverflowDates.map(date => (
              <DayCard
                key={`overflow-next-${toDateStr(date)}`}
                date={date}
                isOverflow
                overflowAssignments={overflowAssignmentsByDate.get(toDateStr(date))}
              />
            ))}
          </div>
        </>
      ) : viewMode === 'list' ? (
        <>

          <h3 className="text-sm font-bold text-steel-700 uppercase tracking-wide mb-4">
            {t('schedule.workerLoadDistribution')}
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
