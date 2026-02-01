import { useState, useEffect } from 'react';
import { ShiftConfiguration, ShiftTypeDefinition, LinePosition } from '../types';
import { useApi } from '../hooks/useApi';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const POSITION_LABELS: Record<LinePosition, string> = {
  supervisor: 'Supervisor',
  first_line: '1st Line',
  second_line: '2nd Line',
  third_line: '3rd Line'
};
const ALL_POSITIONS: LinePosition[] = ['supervisor', 'first_line', 'second_line', 'third_line'];

interface Props {
  onConfigChange?: () => void;
}

export default function ConfigurationTab({ onConfigChange }: Props) {
  const [configuration, setConfiguration] = useState<ShiftConfiguration | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedConfig, setEditedConfig] = useState<ShiftConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useApi();

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    setError(null);
    try {
      const config = await api.getConfiguration();
      setConfiguration(config);
      setEditedConfig(JSON.parse(JSON.stringify(config)));
    } catch (e) {
      setError('Failed to load configuration');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditedConfig(JSON.parse(JSON.stringify(configuration)));
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditedConfig(JSON.parse(JSON.stringify(configuration)));
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!editedConfig) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateConfiguration(editedConfig.id, {
        name: editedConfig.name,
        description: editedConfig.description,
        shiftTypes: editedConfig.shiftTypes,
        dailyRequirements: editedConfig.dailyRequirements
      });
      setConfiguration(updated);
      setEditedConfig(JSON.parse(JSON.stringify(updated)));
      setEditMode(false);
      onConfigChange?.();
    } catch (e) {
      setError('Failed to save configuration');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const updateShiftType = (index: number, field: keyof ShiftTypeDefinition, value: string | boolean) => {
    if (!editedConfig) return;
    const updated = { ...editedConfig };
    updated.shiftTypes = [...updated.shiftTypes];
    updated.shiftTypes[index] = { ...updated.shiftTypes[index], [field]: value };
    setEditedConfig(updated);
  };

  const togglePosition = (dayOfWeek: number, shiftTypeId: string, position: LinePosition) => {
    if (!editedConfig) return;
    const updated = { ...editedConfig };
    updated.dailyRequirements = [...updated.dailyRequirements];

    const reqIndex = updated.dailyRequirements.findIndex(
      r => r.dayOfWeek === dayOfWeek && r.shiftTypeId === shiftTypeId
    );

    if (reqIndex === -1) {
      // Create new requirement with this position
      updated.dailyRequirements.push({
        dayOfWeek,
        shiftTypeId,
        positions: [position]
      });
    } else {
      const req = { ...updated.dailyRequirements[reqIndex] };
      const posIndex = req.positions.indexOf(position);
      if (posIndex === -1) {
        req.positions = [...req.positions, position];
      } else {
        req.positions = req.positions.filter(p => p !== position);
      }
      // Remove requirement if no positions left
      if (req.positions.length === 0) {
        updated.dailyRequirements.splice(reqIndex, 1);
      } else {
        updated.dailyRequirements[reqIndex] = req;
      }
    }

    setEditedConfig(updated);
  };

  const hasPosition = (dayOfWeek: number, shiftTypeId: string, position: LinePosition): boolean => {
    const config = editMode ? editedConfig : configuration;
    if (!config) return false;
    const req = config.dailyRequirements.find(
      r => r.dayOfWeek === dayOfWeek && r.shiftTypeId === shiftTypeId
    );
    return req?.positions.includes(position) ?? false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-steel-500">Loading configuration...</div>
      </div>
    );
  }

  if (error && !configuration) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-rose-600">{error}</div>
      </div>
    );
  }

  const displayConfig = editMode ? editedConfig : configuration;
  if (!displayConfig) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-steel-900">{displayConfig.name}</h2>
          {displayConfig.description && (
            <p className="text-sm text-steel-500 mt-1">{displayConfig.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-steel-600 bg-white border-2 border-steel-200 hover:bg-steel-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-clinic-500 hover:bg-clinic-600 transition-colors shadow-sharp disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="px-4 py-2 text-sm font-semibold text-white bg-clinic-500 hover:bg-clinic-600 transition-colors shadow-sharp"
            >
              Edit Configuration
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Shift Types Section */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-steel-700 uppercase tracking-wider mb-4">
          Shift Types
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayConfig.shiftTypes.map((st, index) => (
            <div key={st.id} className="card-sharp p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 ${
                  st.id === 'day' ? 'bg-amber-400' :
                  st.id === 'evening' ? 'bg-sky-400' :
                  'bg-indigo-400'
                }`}></div>
                <h4 className="font-semibold text-steel-900">{st.name}</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-steel-500 w-16">Start:</label>
                  {editMode ? (
                    <input
                      type="time"
                      value={st.startTime}
                      onChange={(e) => updateShiftType(index, 'startTime', e.target.value)}
                      className="border border-steel-200 px-2 py-1 text-sm focus:outline-none focus:border-clinic-500"
                    />
                  ) : (
                    <span className="font-mono text-sm">{st.startTime}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-steel-500 w-16">End:</label>
                  {editMode ? (
                    <input
                      type="time"
                      value={st.endTime}
                      onChange={(e) => updateShiftType(index, 'endTime', e.target.value)}
                      className="border border-steel-200 px-2 py-1 text-sm focus:outline-none focus:border-clinic-500"
                    />
                  ) : (
                    <span className="font-mono text-sm">{st.endTime}</span>
                  )}
                </div>
                {st.crossesMidnight && (
                  <div className="text-xs text-steel-400 italic">Crosses midnight</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Requirements Matrix */}
      <div>
        <h3 className="text-sm font-bold text-steel-700 uppercase tracking-wider mb-4">
          Daily Position Requirements
        </h3>
        <div className="card-sharp overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-steel-50">
                <th className="p-3 text-left font-semibold text-steel-700 border-b border-steel-200">
                  Day / Shift
                </th>
                {displayConfig.shiftTypes.map(st => (
                  <th
                    key={st.id}
                    colSpan={ALL_POSITIONS.length}
                    className="p-3 text-center font-semibold text-steel-700 border-b border-l border-steel-200"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 ${
                        st.id === 'day' ? 'bg-amber-400' :
                        st.id === 'evening' ? 'bg-sky-400' :
                        'bg-indigo-400'
                      }`}></div>
                      {st.name}
                    </div>
                    <div className="text-xs font-normal text-steel-400 mt-1">
                      {st.startTime} - {st.endTime}
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="bg-steel-50/50">
                <th className="p-2 border-b border-steel-200"></th>
                {displayConfig.shiftTypes.map(st => (
                  ALL_POSITIONS.map((pos, i) => (
                    <th
                      key={`${st.id}-${pos}`}
                      className={`p-2 text-center text-xs font-medium text-steel-500 border-b border-steel-200 ${i === 0 ? 'border-l' : ''}`}
                    >
                      {POSITION_LABELS[pos]}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {DAY_NAMES.map((dayName, dayIndex) => (
                <tr key={dayIndex} className={dayIndex % 2 === 0 ? 'bg-white' : 'bg-steel-50/30'}>
                  <td className="p-3 font-medium text-steel-700 border-b border-steel-100">
                    {dayName}
                    <span className="text-xs text-steel-400 ml-2">
                      {dayIndex === 0 || dayIndex === 6 ? '(Weekend)' : ''}
                    </span>
                  </td>
                  {displayConfig.shiftTypes.map(st => (
                    ALL_POSITIONS.map((pos, i) => {
                      const isActive = hasPosition(dayIndex, st.id, pos);
                      return (
                        <td
                          key={`${st.id}-${pos}`}
                          className={`p-2 text-center border-b border-steel-100 ${i === 0 ? 'border-l border-steel-200' : ''}`}
                        >
                          {editMode ? (
                            <button
                              onClick={() => togglePosition(dayIndex, st.id, pos)}
                              className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                                isActive
                                  ? 'bg-clinic-500 text-white hover:bg-clinic-600'
                                  : 'bg-steel-100 text-steel-400 hover:bg-steel-200'
                              }`}
                            >
                              {isActive ? '+' : '-'}
                            </button>
                          ) : (
                            <div className={`w-8 h-8 rounded flex items-center justify-center mx-auto ${
                              isActive
                                ? 'bg-clinic-100 text-clinic-700'
                                : 'bg-steel-50 text-steel-300'
                            }`}>
                              {isActive ? '+' : '-'}
                            </div>
                          )}
                        </td>
                      );
                    })
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-4 text-xs text-steel-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-clinic-100 text-clinic-700 rounded flex items-center justify-center">+</div>
            <span>Position required</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-steel-50 text-steel-300 rounded flex items-center justify-center">-</div>
            <span>Position not required</span>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-8 pt-4 border-t border-steel-200">
        <p className="text-xs text-steel-400 font-mono">
          Last updated: {new Date(displayConfig.updatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
