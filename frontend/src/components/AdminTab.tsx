import { useState, useEffect, useMemo } from 'react';
import { Clinic } from '../types';
import { useApi } from '../hooks/useApi';
import { useTranslation } from '../i18n';
import { getClinicDisplayName, getSpecialtyKey, formatDateFull } from '../utils/helpers';

interface Props {
  clinics: Clinic[];
  onClinicsChange: () => void;
  onSelectClinic: (id: string) => void;
}

interface ClinicStats {
  workerCount: number;
  configCount: number;
  scheduleCount: number;
}

const SPECIALTY_KEYS = [
  'internalMedicine', 'surgery', 'cardiology', 'neurology', 'pediatrics',
  'orthopedics', 'psychiatry', 'anesthesiology', 'emergencyMedicine',
  'gynecology', 'infectiousDiseases',
] as const;

export default function AdminTab({ clinics, onClinicsChange, onSelectClinic }: Props) {
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [stats, setStats] = useState<Record<string, ClinicStats>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const api = useApi();
  const { t, locale, translations } = useTranslation();

  // Which specialty keys are already used by existing clinics
  const usedSpecialties = useMemo(() => {
    const used = new Set<string>();
    for (const c of clinics) {
      const key = getSpecialtyKey(c.name);
      if (key) used.add(key);
    }
    return used;
  }, [clinics]);

  useEffect(() => {
    clinics.forEach(c => {
      api.getClinicStats(c.id).then(s => {
        setStats(prev => ({ ...prev, [c.id]: s }));
      }).catch(() => {});
    });
  }, [clinics]);

  const clinicName = selectedSpecialty
    ? translations.specialties[selectedSpecialty as keyof typeof translations.specialties]
    : '';

  const handleCreate = async () => {
    if (!clinicName) return;
    setCreating(true);
    setErrorMsg(null);
    try {
      await api.createClinic(clinicName);
      setSelectedSpecialty('');
      onClinicsChange();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('clinic.failedCreate'));
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    setErrorMsg(null);
    try {
      await api.updateClinic(id, renameValue.trim());
      setRenamingId(null);
      onClinicsChange();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('clinic.failedRename'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('clinic.deleteConfirm'))) return;
    setErrorMsg(null);
    try {
      await api.deleteClinic(id);
      onClinicsChange();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('clinic.failedDelete'));
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-steel-900 uppercase tracking-wide mb-6">
        {t('clinic.clinicManagement')}
      </h2>

      {/* Create Clinic */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={selectedSpecialty}
          onChange={e => setSelectedSpecialty(e.target.value)}
          className="border-2 border-steel-200 px-3 py-2 text-sm text-steel-900 bg-white focus:outline-none focus:border-clinic-400 w-64 cursor-pointer"
        >
          <option value="">{t('clinic.selectSpecialty')}</option>
          {SPECIALTY_KEYS.map(key => {
            const taken = usedSpecialties.has(key);
            return (
              <option key={key} value={key} disabled={taken}>
                {translations.specialties[key]}{taken ? ' \u2713' : ''}
              </option>
            );
          })}
        </select>
        <button
          onClick={handleCreate}
          disabled={creating || !clinicName}
          className="bg-clinic-500 text-white px-4 py-2 text-sm font-semibold hover:bg-clinic-600 transition-colors disabled:opacity-50"
        >
          {t('clinic.createClinic')}
        </button>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="mb-4 px-4 py-2 bg-clay-50 border-2 border-clay-200 text-clay-700 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Clinics Table */}
      <div className="border-2 border-steel-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-steel-50 border-b-2 border-steel-200">
              <th className="text-left px-4 py-3 font-semibold text-steel-600 uppercase tracking-wider text-xs">
                {t('clinic.clinicName')}
              </th>
              <th className="text-center px-4 py-3 font-semibold text-steel-600 uppercase tracking-wider text-xs">
                {t('clinic.workers')}
              </th>
              <th className="text-center px-4 py-3 font-semibold text-steel-600 uppercase tracking-wider text-xs">
                {t('clinic.configs')}
              </th>
              <th className="text-center px-4 py-3 font-semibold text-steel-600 uppercase tracking-wider text-xs">
                {t('clinic.schedules')}
              </th>
              <th className="text-left px-4 py-3 font-semibold text-steel-600 uppercase tracking-wider text-xs">
                {t('clinic.created')}
              </th>
              <th className="text-right px-4 py-3 font-semibold text-steel-600 uppercase tracking-wider text-xs">
                {t('workers.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {clinics.map(clinic => {
              const s = stats[clinic.id];
              return (
                <tr key={clinic.id} className="border-b border-steel-100 hover:bg-steel-50/50">
                  <td className="px-4 py-3">
                    {renamingId === clinic.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(clinic.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onBlur={() => setRenamingId(null)}
                        className="border-2 border-clinic-400 px-2 py-1 text-sm text-steel-900 focus:outline-none w-full"
                      />
                    ) : (
                      <button
                        onClick={() => onSelectClinic(clinic.id)}
                        className="font-semibold text-steel-900 hover:text-clinic-600 transition-colors text-left"
                      >
                        {getClinicDisplayName(clinic.name, translations)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-steel-700">
                    {s ? s.workerCount : '-'}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-steel-700">
                    {s ? s.configCount : '-'}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-steel-700">
                    {s ? s.scheduleCount : '-'}
                  </td>
                  <td className="px-4 py-3 text-steel-500 text-xs font-mono">
                    {formatDateFull(clinic.createdAt, locale)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setRenamingId(clinic.id);
                          setRenameValue(clinic.name);
                        }}
                        className="px-3 py-1 text-xs font-semibold border-2 border-steel-200 text-steel-600 hover:bg-steel-50 transition-colors"
                      >
                        {t('clinic.rename')}
                      </button>
                      <button
                        onClick={() => handleDelete(clinic.id)}
                        className="px-3 py-1 text-xs font-semibold border-2 border-clay-200 text-clay-600 hover:bg-clay-50 transition-colors"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
