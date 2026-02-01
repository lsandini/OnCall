import { useState } from 'react';
import { Worker, WorkerRole, WorkerType } from '../types';
import { useApi } from '../hooks/useApi';

interface Props {
  worker: Worker | null;
  onClose: () => void;
  onSave: () => void;
}

export default function WorkerForm({ worker, onClose, onSave }: Props) {
  const [name, setName] = useState(worker?.name || '');
  const [role, setRole] = useState<WorkerRole>(worker?.role || 'resident');
  const [type, setType] = useState<WorkerType>(worker?.type || 'permanent');
  const [canDoubleSift, setCanDoubleSift] = useState(worker?.canDoubleSift || false);
  const [yearOfStudy, setYearOfStudy] = useState(worker?.yearOfStudy || 4);
  const [saving, setSaving] = useState(false);

  const api = useApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        role,
        type,
        canDoubleSift: type === 'external' ? canDoubleSift : false,
        yearOfStudy: role === 'student' ? yearOfStudy : undefined
      };

      if (worker) {
        await api.updateWorker(worker.id, data);
      } else {
        await api.createWorker(data);
      }
      onSave();
    } catch (e) {
      alert('Failed to save worker');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-steel-900/50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-steel-200 shadow-sharp-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200">
          <h2 className="text-lg font-bold text-steel-900">
            {worker ? 'Edit Personnel' : 'Add Personnel'}
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
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-2 border-steel-200 px-4 py-2.5 focus:outline-none focus:border-clinic-500"
              placeholder="Dr. Name Surname"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-steel-600 uppercase tracking-wide mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkerRole)}
              className="w-full border-2 border-steel-200 px-4 py-2.5 bg-white focus:outline-none focus:border-clinic-500"
            >
              <option value="senior_specialist">Senior Specialist (Supervisor)</option>
              <option value="resident">Resident (1st/2nd Line)</option>
              <option value="student">Medical Student (2nd/3rd Line)</option>
            </select>
          </div>

          {role === 'student' && (
            <div>
              <label className="block text-xs font-semibold text-steel-600 uppercase tracking-wide mb-2">
                Year of Study
              </label>
              <select
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(parseInt(e.target.value))}
                className="w-full border-2 border-steel-200 px-4 py-2.5 bg-white focus:outline-none focus:border-clinic-500"
              >
                <option value={4}>4th Year</option>
                <option value={5}>5th Year</option>
                <option value={6}>6th Year</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-steel-600 uppercase tracking-wide mb-2">
              Employment Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as WorkerType)}
              className="w-full border-2 border-steel-200 px-4 py-2.5 bg-white focus:outline-none focus:border-clinic-500"
            >
              <option value="permanent">Permanent Staff</option>
              <option value="external">External (On Demand)</option>
            </select>
          </div>

          {type === 'external' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canDouble"
                checked={canDoubleSift}
                onChange={(e) => setCanDoubleSift(e.target.checked)}
                className="w-5 h-5 border-2 border-steel-300 text-clinic-500 focus:ring-clinic-500"
              />
              <label htmlFor="canDouble" className="text-sm text-steel-700">
                Can work double shifts (evening + night)
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-steel-200 text-steel-600 font-semibold hover:bg-steel-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-clinic-500 text-white font-semibold hover:bg-clinic-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : worker ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
