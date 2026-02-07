import { useState } from 'react';
import { Worker, WorkerRole, WorkerType } from '../types';
import { useApi } from '../hooks/useApi';
import { useTranslation } from '../i18n';

interface Props {
  worker: Worker | null;
  onClose: () => void;
  onSave: () => void;
  clinicId: string;
}

export default function WorkerForm({ worker, onClose, onSave, clinicId }: Props) {
  const [name, setName] = useState(worker?.name || '');
  const [role, setRole] = useState<WorkerRole>(worker?.role || 'resident');
  const [type, setType] = useState<WorkerType>(worker?.type || 'permanent');
  const [canDoubleShift, setCanDoubleShift] = useState(worker?.canDoubleShift || false);
  const [yearOfStudy, setYearOfStudy] = useState(worker?.yearOfStudy || 4);
  const [startDate, setStartDate] = useState(worker?.startDate || '');
  const [endDate, setEndDate] = useState(worker?.endDate || '');
  const [saving, setSaving] = useState(false);

  const api = useApi();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        role,
        type,
        canDoubleShift: type === 'external' ? canDoubleShift : false,
        yearOfStudy: role === 'student' ? yearOfStudy : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      if (worker) {
        await api.updateWorker(worker.id, data);
      } else {
        await api.createWorker(clinicId, data);
      }
      onSave();
    } catch (e) {
      alert(t('workerForm.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-steel-900/50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-steel-200 shadow-sharp-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200">
          <h2 className="text-lg font-bold text-steel-900">
            {worker ? t('workerForm.editTitle') : t('workerForm.addTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-steel-400 hover:text-steel-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-steel-600 uppercase tracking-wide mb-2">
              {t('workerForm.fullName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-2 border-steel-200 px-4 py-2.5 focus:outline-none focus:border-clinic-500"
              placeholder={t('workerForm.namePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-steel-600 uppercase tracking-wide mb-2">
              {t('workerForm.role')}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkerRole)}
              className="w-full border-2 border-steel-200 px-4 py-2.5 bg-white focus:outline-none focus:border-clinic-500"
            >
              <option value="senior_specialist">{t('workerForm.seniorSpecialistOption')}</option>
              <option value="resident">{t('workerForm.residentOption')}</option>
              <option value="student">{t('workerForm.studentOption')}</option>
            </select>
          </div>

          {role === 'student' && (
            <div>
              <label className="block text-xs font-semibold text-steel-600 uppercase tracking-wide mb-2">
                {t('workerForm.yearOfStudy')}
              </label>
              <select
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(parseInt(e.target.value))}
                className="w-full border-2 border-steel-200 px-4 py-2.5 bg-white focus:outline-none focus:border-clinic-500"
              >
                <option value={4}>4. {t('workerForm.yearOption')}</option>
                <option value={5}>5. {t('workerForm.yearOption')}</option>
                <option value={6}>6. {t('workerForm.yearOption')}</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-steel-600 uppercase tracking-wide mb-2">
              {t('workerForm.employmentType')}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as WorkerType)}
              className="w-full border-2 border-steel-200 px-4 py-2.5 bg-white focus:outline-none focus:border-clinic-500"
            >
              <option value="permanent">{t('workerForm.permanentStaff')}</option>
              <option value="external">{t('workerForm.externalOnDemand')}</option>
            </select>
          </div>

          {type === 'external' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canDouble"
                checked={canDoubleShift}
                onChange={(e) => setCanDoubleShift(e.target.checked)}
                className="w-5 h-5 border-2 border-steel-300 text-clinic-500 focus:ring-clinic-500"
              />
              <label htmlFor="canDouble" className="text-sm text-steel-700">
                {t('workerForm.canDoubleShift')}
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-steel-600 uppercase tracking-wide mb-2">
                {t('workerForm.startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border-2 border-steel-200 px-3 py-2 focus:outline-none focus:border-clinic-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-steel-600 uppercase tracking-wide mb-2">
                {t('workerForm.endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border-2 border-steel-200 px-3 py-2 focus:outline-none focus:border-clinic-500"
              />
            </div>
          </div>
          <p className="text-xs text-steel-400">{t('workerForm.ongoingHint')}</p>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-steel-200 text-steel-600 font-semibold hover:bg-steel-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-clinic-500 text-white font-semibold hover:bg-clinic-600 transition-colors disabled:opacity-50"
            >
              {saving ? t('common.saving') : worker ? t('workerForm.update') : t('workerForm.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
