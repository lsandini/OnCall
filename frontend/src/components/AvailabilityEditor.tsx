import { useState, useEffect } from 'react';
import { Worker, WeeklyAvailability, ShiftType, AvailabilityStatus } from '../types';
import { useApi } from '../hooks/useApi';
import { DAY_NAMES, SHIFT_LABELS } from '../utils/helpers';

interface Props {
  worker: Worker;
  year: number;
  onClose: () => void;
}

const SHIFTS: ShiftType[] = ['day', 'evening', 'night'];
const DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

const STATUS_COLORS: Record<AvailabilityStatus, string> = {
  available: 'bg-white border-steel-200',
  preferred: 'bg-clinic-100 border-clinic-400',
  unavailable: 'bg-rose-100 border-rose-400'
};

const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Available',
  preferred: 'Preferred',
  unavailable: 'Unavailable'
};

export default function AvailabilityEditor({ worker, year, onClose }: Props) {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [availability, setAvailability] = useState<WeeklyAvailability[]>([]);
  const [saving, setSaving] = useState(false);

  const api = useApi();

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

  const getStatus = (week: number, day: number, shift: ShiftType): AvailabilityStatus => {
    const entry = availability.find(
      a => a.week === week && a.day === day && a.shiftType === shift && a.year === year
    );
    return entry?.status || 'available';
  };

  const cycleStatus = async (week: number, day: number, shift: ShiftType) => {
    const current = getStatus(week, day, shift);
    const next: AvailabilityStatus =
      current === 'available' ? 'preferred' :
      current === 'preferred' ? 'unavailable' : 'available';

    // Optimistic update
    const newEntry: WeeklyAvailability = {
      workerId: worker.id,
      year,
      week,
      day,
      shiftType: shift,
      status: next
    };

    setAvailability(prev => {
      const filtered = prev.filter(
        a => !(a.week === week && a.day === day && a.shiftType === shift && a.year === year)
      );
      if (next !== 'available') {
        return [...filtered, newEntry];
      }
      return filtered;
    });

    // Persist
    try {
      await api.setAvailability(newEntry);
    } catch (e) {
      console.error('Failed to save availability', e);
      loadAvailability(); // Reload on error
    }
  };

  const applyToAllWeeks = async (day: number, shift: ShiftType) => {
    const status = getStatus(currentWeek, day, shift);
    if (status === 'available') return;

    setSaving(true);
    const entries: WeeklyAvailability[] = [];
    for (let w = 1; w <= 52; w++) {
      entries.push({
        workerId: worker.id,
        year,
        week: w,
        day,
        shiftType: shift,
        status
      });
    }

    try {
      await api.batchSetAvailability(entries);
      await loadAvailability();
    } catch (e) {
      console.error('Failed to apply to all weeks', e);
    } finally {
      setSaving(false);
    }
  };

  // Only show relevant shifts based on role
  const relevantShifts = worker.role === 'senior_specialist'
    ? ['evening' as ShiftType] // Supervisors only do evening (3PM onwards)
    : SHIFTS;

  return (
    <div className="fixed inset-0 bg-steel-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-steel-200 shadow-sharp-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200">
          <div>
            <h2 className="text-lg font-bold text-steel-900">Availability Settings</h2>
            <p className="text-sm text-steel-500 font-mono">{worker.name} // {year}</p>
          </div>
          <button
            onClick={onClose}
            className="text-steel-400 hover:text-steel-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          {/* Week selector */}
          <div className="flex items-center gap-4 mb-6">
            <label className="text-sm font-semibold text-steel-600">Week:</label>
            <input
              type="range"
              min={1}
              max={52}
              value={currentWeek}
              onChange={(e) => setCurrentWeek(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="font-mono text-lg font-bold text-clinic-600 w-12 text-center">
              {currentWeek}
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mb-6 text-sm">
            <span className="text-steel-500">Click to cycle:</span>
            {(['available', 'preferred', 'unavailable'] as AvailabilityStatus[]).map(status => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-6 h-6 border-2 ${STATUS_COLORS[status]}`} />
                <span className="text-steel-600">{STATUS_LABELS[status]}</span>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs font-semibold text-steel-500 uppercase">Shift</th>
                  {DAYS.map(day => (
                    <th key={day} className="p-2 text-center text-xs font-semibold text-steel-500 uppercase">
                      {DAY_NAMES[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {relevantShifts.map(shift => (
                  <tr key={shift}>
                    <td className="p-2 text-sm font-mono text-steel-600 whitespace-nowrap">
                      {SHIFT_LABELS[shift]}
                    </td>
                    {DAYS.map(day => {
                      const status = getStatus(currentWeek, day, shift);
                      return (
                        <td key={day} className="p-1">
                          <button
                            onClick={() => cycleStatus(currentWeek, day, shift)}
                            onDoubleClick={() => applyToAllWeeks(day, shift)}
                            className={`w-full h-12 border-2 transition-colors ${STATUS_COLORS[status]} hover:opacity-80`}
                            title={`${STATUS_LABELS[status]} - Double-click to apply to all weeks`}
                          >
                            {status === 'preferred' && (
                              <span className="text-clinic-600 text-lg">*</span>
                            )}
                            {status === 'unavailable' && (
                              <span className="text-rose-600 text-lg">x</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-steel-400 mt-4">
            Tip: Double-click a cell to apply the same status to all 52 weeks for that day/shift combination.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-steel-200 bg-steel-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 bg-clinic-500 text-white font-semibold hover:bg-clinic-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
