import { useState, useEffect } from 'react';
import { ShiftConfiguration, ShiftTypeDefinition, LinePosition, Holiday } from '../types';
import { useApi } from '../hooks/useApi';
import { getPositionLabels, getDayNamesFull, getShiftName, getConfigName, getConfigDescription } from '../utils/helpers';
import { useTranslation } from '../i18n';

const ALL_POSITIONS: LinePosition[] = ['supervisor', 'first_line', 'second_line', 'third_line'];

interface Props {
  onConfigChange?: () => void;
  clinicId: string;
}

export default function ConfigurationTab({ onConfigChange, clinicId }: Props) {
  const [configuration, setConfiguration] = useState<ShiftConfiguration | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedConfig, setEditedConfig] = useState<ShiftConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Holiday/Region state
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  const [states, setStates] = useState<{ code: string; name: string }[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
  const [savingSettings, setSavingSettings] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);

  const api = useApi();
  const { t, locale, translations } = useTranslation();
  const positionLabels = getPositionLabels(translations);
  const dayNames = getDayNamesFull(translations);

  useEffect(() => {
    loadConfiguration();
    loadHolidayData();
  }, [clinicId]);

  useEffect(() => {
    if (settings.country) {
      loadHolidays();
    }
  }, [holidayYear, settings.country]);

  const loadConfiguration = async () => {
    setLoading(true);
    setError(null);
    try {
      const config = await api.getConfiguration(clinicId);
      setConfiguration(config);
      setEditedConfig(JSON.parse(JSON.stringify(config)));
    } catch (e) {
      setError(t('config.failedLoadConfig'));
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadHolidayData = async () => {
    try {
      const [countriesList, currentSettings] = await Promise.all([
        api.getCountries(),
        api.getSettings()
      ]);
      setCountries(countriesList);
      setSettings(currentSettings);
      setSelectedCountry(currentSettings.country || 'FI');
      setSelectedRegion(currentSettings.region || '');

      if (currentSettings.country) {
        const statesList = await api.getStates(currentSettings.country);
        setStates(statesList);
      }
    } catch (e) {
      console.error('Failed to load holiday data', e);
    }
  };

  const loadHolidays = async () => {
    try {
      const h = await api.getHolidays(holidayYear);
      setHolidays(h);
    } catch (e) {
      console.error('Failed to load holidays', e);
    }
  };

  const handleCountryChange = async (code: string) => {
    setSelectedCountry(code);
    setSelectedRegion('');
    try {
      const statesList = await api.getStates(code);
      setStates(statesList);
    } catch {
      setStates([]);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const updated = await api.updateSettings({
        country: selectedCountry,
        region: selectedRegion || undefined
      });
      setSettings(updated);
      await loadHolidays();
    } catch (e) {
      console.error('Failed to save settings', e);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayName) return;
    setAddingHoliday(true);
    try {
      await api.addHoliday(newHolidayDate, newHolidayName);
      setNewHolidayDate('');
      setNewHolidayName('');
      await loadHolidays();
    } catch (e) {
      console.error('Failed to add holiday', e);
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleRemoveHoliday = async (date: string) => {
    try {
      await api.removeHoliday(date);
      await loadHolidays();
    } catch (e) {
      console.error('Failed to remove holiday', e);
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
      setError(t('config.failedSaveConfig'));
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
        <div className="text-steel-500">{t('config.loadingConfig')}</div>
      </div>
    );
  }

  if (error && !configuration) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-clay-600">{error}</div>
      </div>
    );
  }

  const displayConfig = editMode ? editedConfig : configuration;
  if (!displayConfig) return null;

  const countryName = countries.find(c => c.code === selectedCountry)?.name || selectedCountry;

  return (
    <div>
      {/* Region & Holidays Section */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-steel-700 uppercase tracking-wider mb-4">
          {t('config.regionAndHolidays')}
        </h3>

        <div className="card-sharp p-4 mb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-steel-600 uppercase mb-1">{t('config.country')}</label>
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full border-2 border-steel-200 px-3 py-2 text-sm focus:outline-none focus:border-clinic-500"
              >
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            {states.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-steel-600 uppercase mb-1">{t('config.stateRegion')}</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full border-2 border-steel-200 px-3 py-2 text-sm focus:outline-none focus:border-clinic-500"
                >
                  <option value="">{t('config.allDefault')}</option>
                  {states.map(s => (
                    <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleSaveSettings}
              disabled={savingSettings || (selectedCountry === settings.country && selectedRegion === (settings.region || ''))}
              className="px-4 py-2 text-sm font-semibold text-white bg-clinic-500 hover:bg-clinic-600 transition-colors shadow-sharp disabled:opacity-50"
            >
              {savingSettings ? t('common.saving') : t('config.saveCountry')}
            </button>
          </div>
        </div>

        {/* Holiday List */}
        <div className="card-sharp p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-steel-900">
              {t('config.holidays')} — {countryName} ({holidayYear})
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHolidayYear(y => y - 1)}
                className="px-2 py-1 text-sm border-2 border-steel-200 hover:bg-steel-50"
              >
                &larr;
              </button>
              <span className="font-mono text-sm font-semibold text-steel-700">{holidayYear}</span>
              <button
                onClick={() => setHolidayYear(y => y + 1)}
                className="px-2 py-1 text-sm border-2 border-steel-200 hover:bg-steel-50"
              >
                &rarr;
              </button>
            </div>
          </div>

          {holidays.length === 0 ? (
            <p className="text-sm text-steel-400 italic">{t('config.noHolidays')}</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto mb-4">
              {holidays.map(h => (
                <div key={h.date} className="flex items-center justify-between px-3 py-2 hover:bg-steel-50 group">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-steel-600 w-24">{h.date}</span>
                    <span className="text-sm text-steel-900">{h.name}</span>
                    <span className={`text-xs px-2 py-0.5 font-semibold ${
                      h.type === 'custom'
                        ? 'bg-steel-100 text-steel-700 border border-steel-200'
                        : 'bg-clinic-50 text-clinic-700 border border-clinic-200'
                    }`}>
                      {h.type === 'custom' ? t('config.custom') : t('config.public')}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveHoliday(h.date)}
                    className="text-steel-400 hover:text-clay-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
                    title={t('config.removeHoliday')}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add custom holiday */}
          <div className="flex items-end gap-3 pt-3 border-t border-steel-200">
            <div>
              <label className="block text-xs font-semibold text-steel-600 uppercase mb-1">{t('config.holidayDate')}</label>
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="border-2 border-steel-200 px-3 py-1.5 text-sm focus:outline-none focus:border-clinic-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-steel-600 uppercase mb-1">{t('config.holidayName')}</label>
              <input
                type="text"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                placeholder={t('config.holidayPlaceholder')}
                className="w-full border-2 border-steel-200 px-3 py-1.5 text-sm focus:outline-none focus:border-clinic-500"
              />
            </div>
            <button
              onClick={handleAddHoliday}
              disabled={addingHoliday || !newHolidayDate || !newHolidayName}
              className="px-4 py-1.5 text-sm font-semibold text-white bg-clinic-500 hover:bg-clinic-600 transition-colors shadow-sharp disabled:opacity-50"
            >
              {addingHoliday ? t('config.adding') : t('config.addHoliday')}
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-steel-900">{getConfigName(displayConfig.name, translations)}</h2>
          {displayConfig.description && (
            <p className="text-sm text-steel-500 mt-1">{getConfigDescription(displayConfig.description, translations)}</p>
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-clinic-500 hover:bg-clinic-600 transition-colors shadow-sharp disabled:opacity-50"
              >
                {saving ? t('common.saving') : t('config.saveChanges')}
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="px-4 py-2 text-sm font-semibold text-white bg-clinic-500 hover:bg-clinic-600 transition-colors shadow-sharp"
            >
              {t('config.editConfiguration')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-clay-50 border border-clay-200 text-clay-700 text-sm">
          {error}
        </div>
      )}

      {/* Shift Types Section */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-steel-700 uppercase tracking-wider mb-4">
          {t('config.shiftTypes')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayConfig.shiftTypes.map((st, index) => (
            <div key={st.id} className="card-sharp p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 ${
                  st.id === 'day' ? 'bg-clay-400' :
                  st.id === 'evening' ? 'bg-clinic-400' :
                  'bg-steel-500'
                }`}></div>
                <h4 className="font-semibold text-steel-900">{getShiftName(st.id, st.name, translations)}</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-steel-500 w-16">{t('config.startTime')}:</label>
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
                  <label className="text-xs text-steel-500 w-16">{t('config.endTime')}:</label>
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
                  <div className="text-xs text-steel-400 italic">{t('config.crossesMidnight')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Requirements Matrix */}
      <div>
        <h3 className="text-sm font-bold text-steel-700 uppercase tracking-wider mb-4">
          {t('config.dailyPositionRequirements')}
        </h3>
        <div className="card-sharp overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-steel-50">
                <th className="p-3 text-left font-semibold text-steel-700 border-b border-steel-200">
                  {t('config.dayShift')}
                </th>
                {displayConfig.shiftTypes.map(st => (
                  <th
                    key={st.id}
                    colSpan={ALL_POSITIONS.length}
                    className="p-3 text-center font-semibold text-steel-700 border-b border-l border-steel-200"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 ${
                        st.id === 'day' ? 'bg-clay-400' :
                        st.id === 'evening' ? 'bg-clinic-400' :
                        'bg-steel-500'
                      }`}></div>
                      {getShiftName(st.id, st.name, translations)}
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
                      {positionLabels[pos]}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Monday-first order: dayOfWeek 1,2,3,4,5,6,0 */}
              {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek, rowIndex) => (
                <tr key={dayOfWeek} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-steel-50/30'}>
                  <td className="p-3 font-medium text-steel-700 border-b border-steel-100">
                    {dayNames[dayOfWeek]}
                    <span className="text-xs text-steel-400 ml-2">
                      {dayOfWeek === 0 || dayOfWeek === 6 ? `(${t('common.weekend')})` : ''}
                    </span>
                  </td>
                  {displayConfig.shiftTypes.map(st => (
                    ALL_POSITIONS.map((pos, i) => {
                      const isActive = hasPosition(dayOfWeek, st.id, pos);
                      return (
                        <td
                          key={`${st.id}-${pos}`}
                          className={`p-2 text-center border-b border-steel-100 ${i === 0 ? 'border-l border-steel-200' : ''}`}
                        >
                          {editMode ? (
                            <button
                              onClick={() => togglePosition(dayOfWeek, st.id, pos)}
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
            <span>{t('config.positionRequired')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-steel-50 text-steel-300 rounded flex items-center justify-center">-</div>
            <span>{t('config.positionNotRequired')}</span>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-8 pt-4 border-t border-steel-200">
        <p className="text-xs text-steel-400 font-mono">
          {t('config.lastUpdated')}: {new Date(displayConfig.updatedAt).toLocaleString(locale === 'fi' ? 'fi-FI' : 'en-GB')}
        </p>
      </div>
    </div>
  );
}
