import { useState, useEffect, useMemo } from 'react';
import { Worker, WeeklyAvailability, ShiftType, AvailabilityStatus } from '../types';
import { useApi } from '../hooks/useApi';
import { getMonthNames, getDayNames, getWeekNumber } from '../utils/helpers';
import { useTranslation } from '../i18n';

interface Props {
  worker: Worker;
  year: number;
  onClose: () => void;
}

const STATUS_COLORS: Record<AvailabilityStatus | 'default', string> = {
  default: 'bg-white border-steel-200 hover:bg-steel-50',
  available: 'bg-white border-steel-200 hover:bg-steel-50',
  preferred: 'bg-clinic-100 border-clinic-400 hover:bg-clinic-200',
  unavailable: 'bg-clay-100 border-clay-400 hover:bg-clay-200'
};

// Get all shifts relevant for a worker's role
function getRelevantShifts(role: string): ShiftType[] {
  if (role === 'senior_specialist') {
    return ['evening', 'day']; // Supervisors work evening (weekdays) and day (weekends)
  }
  return ['day', 'evening', 'night'];
}

export default function AvailabilityEditor({ worker, year, onClose }: Props) {
  const [currentMonth, setCurrentMonth] = useState(1);
  const [availability, setAvailability] = useState<WeeklyAvailability[]>([]);
  const [saving, setSaving] = useState(false);

  const api = useApi();
  const { t, translations } = useTranslation();
  const monthNames = getMonthNames(translations);
  const dayHeaders = getDayNames(translations);
  // Reorder: Mon-Sun (dayNames is Sun-first, we need Mon-first)
  const monFirstDayHeaders = [...dayHeaders.slice(1), dayHeaders[0]];

  useEffect(() => {
    loadAvailability();
  }, [worker.id]);

  const loadAvailability = async () => {
    try {
      const data = await api.getWorkerAvailability(worker.id);
      setAvailability(data);
    } catch (e) {
      console.error('Failed to load availability', e);
    }
  };

  // Get dates for the current month
  const monthDates = useMemo(() => {
    const dates: Date[] = [];
    const firstDay = new Date(year, currentMonth - 1, 1);
    const lastDay = new Date(year, currentMonth, 0);
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    return dates;
  }, [year, currentMonth]);

  // Get the day offset for the first day of month (0 = Monday, 6 = Sunday)
  const firstDayOffset = useMemo(() => {
    const firstDay = new Date(year, currentMonth - 1, 1);
    const day = firstDay.getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to 6, Monday=1 to 0, etc.
  }, [year, currentMonth]);

  // Get status for a specific date (check all relevant shifts)
  const getDateStatus = (date: Date): AvailabilityStatus | 'default' => {
    const week = getWeekNumber(date);
    const day = date.getDay();
    const dateYear = date.getFullYear();
    const relevantShifts = getRelevantShifts(worker.role);

    // Find any availability entry for this date
    const entries = availability.filter(a =>
      a.year === dateYear &&
      a.week === week &&
      a.day === day &&
      relevantShifts.includes(a.shiftType)
    );

    if (entries.length === 0) return 'default';

    // If any shift is unavailable, show as unavailable
    if (entries.some(e => e.status === 'unavailable')) return 'unavailable';
    // If any shift is preferred, show as preferred
    if (entries.some(e => e.status === 'preferred')) return 'preferred';
    return 'default';
  };

  // Cycle through statuses: default -> preferred -> unavailable -> default
  const cycleStatus = async (date: Date) => {
    const currentStatus = getDateStatus(date);
    const nextStatus: AvailabilityStatus | null =
      currentStatus === 'default' ? 'preferred' :
      currentStatus === 'preferred' ? 'unavailable' : null; // null means remove

    const week = getWeekNumber(date);
    const day = date.getDay();
    const dateYear = date.getFullYear();
    const relevantShifts = getRelevantShifts(worker.role);

    setSaving(true);

    try {
      if (nextStatus === null) {
        // Remove all entries for this date - set back to 'available' (which removes from storage)
        const entries = relevantShifts.map(shiftType => ({
          workerId: worker.id,
          year: dateYear,
          week,
          day,
          shiftType,
          status: 'available' as AvailabilityStatus
        }));
        await api.batchSetAvailability(entries);
      } else {
        // Set all relevant shifts to the new status
        const entries = relevantShifts.map(shiftType => ({
          workerId: worker.id,
          year: dateYear,
          week,
          day,
          shiftType,
          status: nextStatus
        }));
        await api.batchSetAvailability(entries);
      }
      await loadAvailability();
    } catch (e) {
      console.error('Failed to save availability', e);
    } finally {
      setSaving(false);
    }
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  return (
    <div className="fixed inset-0 bg-steel-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-steel-200 shadow-sharp-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200">
          <div>
            <h2 className="text-lg font-bold text-steel-900">{t('availability.title')}</h2>
            <p className="text-sm text-steel-500 font-mono">{worker.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-steel-400 hover:text-steel-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          {/* Month selector */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(m => Math.max(1, m - 1))}
              disabled={currentMonth === 1}
              className="px-3 py-1 border-2 border-steel-200 font-semibold hover:bg-steel-50 disabled:opacity-30"
            >
              &larr;
            </button>
            <h3 className="text-xl font-bold text-steel-900">
              {monthNames[currentMonth - 1]} {year}
            </h3>
            <button
              onClick={() => setCurrentMonth(m => Math.min(12, m + 1))}
              disabled={currentMonth === 12}
              className="px-3 py-1 border-2 border-steel-200 font-semibold hover:bg-steel-50 disabled:opacity-30"
            >
              &rarr;
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border rounded bg-white border-steel-200" />
              <span className="text-steel-500">{t('common.default')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border rounded bg-clinic-100 border-clinic-400" />
              <span className="text-steel-500">{t('availability.preferred')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border rounded bg-clay-100 border-clay-400" />
              <span className="text-steel-500">{t('availability.unavailable')}</span>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 max-w-md mx-auto">
            {/* Day headers */}
            {monFirstDayHeaders.map((day, i) => (
              <div key={i} className="text-center text-xs font-semibold text-steel-500 uppercase py-1">
                {day}
              </div>
            ))}

            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}

            {/* Date cells */}
            {monthDates.map(date => {
              const status = getDateStatus(date);
              const weekend = isWeekend(date);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => cycleStatus(date)}
                  disabled={saving}
                  className={`h-9 w-full border rounded flex items-center justify-center transition-colors text-sm font-mono ${STATUS_COLORS[status]} ${weekend ? 'bg-opacity-50' : ''} disabled:opacity-50`}
                  title={status !== 'default' ? status : ''}
                >
                  <span className={weekend ? 'text-clay-600' : 'text-steel-700'}>
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

        <div className="px-4 py-3 border-t border-steel-200 bg-steel-50 flex justify-between items-center">
          <span className="text-xs text-steel-400">
            {saving ? t('common.saving') : t('availability.clickToCycle')}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-clinic-500 text-white text-sm font-semibold hover:bg-clinic-600 transition-colors"
          >
            {t('common.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
