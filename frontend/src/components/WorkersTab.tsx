import { useState, useMemo } from 'react';
import { Worker, WorkerRole, WorkerType } from '../types';
import { useApi } from '../hooks/useApi';
import { getRoleLabels, getMonthNames } from '../utils/helpers';
import { useTranslation } from '../i18n';
import WorkerForm from './WorkerForm';
import AvailabilityEditor from './AvailabilityEditor';

interface Props {
  workers: Worker[];
  onWorkersChange: () => void;
  selectedYear: number;
  selectedMonth: number;
  clinicId: string;
}

// Check if a worker is active during a specific month
function isWorkerActiveInMonth(worker: Worker, year: number, month: number): boolean {
  if (!worker.active) return false;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // Last day of month

  // If no start date, assume always started
  const startDate = worker.startDate ? new Date(worker.startDate) : new Date(0);
  // If no end date, assume ongoing
  const endDate = worker.endDate ? new Date(worker.endDate) : new Date(9999, 11, 31);

  // Worker is active if their employment period overlaps with the month
  return startDate <= monthEnd && endDate >= monthStart;
}

// Format date for display
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function WorkersTab({ workers, onWorkersChange, selectedYear, selectedMonth, clinicId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [availabilityWorker, setAvailabilityWorker] = useState<Worker | null>(null);
  const [roleFilter, setRoleFilter] = useState<WorkerRole | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<WorkerType | 'all'>('all');

  const api = useApi();
  const { t, translations } = useTranslation();
  const monthNames = getMonthNames(translations);
  const roleLabels = getRoleLabels(translations);

  // Filter workers by role/type and active in current month
  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      if (!isWorkerActiveInMonth(w, selectedYear, selectedMonth)) return false;
      if (roleFilter !== 'all' && w.role !== roleFilter) return false;
      if (typeFilter !== 'all' && w.type !== typeFilter) return false;
      return true;
    });
  }, [workers, selectedYear, selectedMonth, roleFilter, typeFilter]);

  // Group by role
  const seniorSpecialists = filteredWorkers.filter(w => w.role === 'senior_specialist');
  const residents = filteredWorkers.filter(w => w.role === 'resident');
  const students = filteredWorkers.filter(w => w.role === 'student');

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setShowForm(true);
  };

  const handleDelete = async (worker: Worker) => {
    if (!confirm(`${t('workers.deactivateConfirm')} ${worker.name}?`)) return;
    try {
      await api.deleteWorker(worker.id);
      onWorkersChange();
    } catch (e) {
      alert(t('workers.failedDelete'));
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingWorker(null);
  };

  const handleFormSave = () => {
    handleFormClose();
    onWorkersChange();
  };

  const WorkerRow = ({ worker }: { worker: Worker }) => (
    <tr className="border-b border-steel-100 hover:bg-steel-50">
      <td className="py-3 px-4">
        <div className="font-medium text-steel-900">{worker.name}</div>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs font-mono text-steel-600 uppercase">{roleLabels[worker.role]}</span>
        {worker.yearOfStudy && (
          <span className="text-xs text-steel-400 ml-1">Y{worker.yearOfStudy}</span>
        )}
      </td>
      <td className="py-3 px-4">
        {worker.type === 'external' ? (
          <span className="text-xs px-2 py-0.5 bg-clay-100 border border-clay-300 text-clay-700">{t('workers.ext')}</span>
        ) : (
          <span className="text-xs text-steel-400">{t('workers.permanent')}</span>
        )}
      </td>
      <td className="py-3 px-4 text-xs font-mono text-steel-500">
        {formatDate(worker.startDate)}
      </td>
      <td className="py-3 px-4 text-xs font-mono text-steel-500">
        {formatDate(worker.endDate)}
      </td>
      <td className="py-3 px-4">
        {worker.canDoubleSift && (
          <span className="text-xs px-2 py-0.5 bg-clinic-50 border border-clinic-300 text-clinic-700">2x</span>
        )}
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1">
          <button
            onClick={() => setAvailabilityWorker(worker)}
            className="px-2 py-1 text-xs font-medium text-clinic-700 hover:bg-clinic-50 transition-colors"
          >
            {t('workers.avail')}
          </button>
          <button
            onClick={() => handleEdit(worker)}
            className="px-2 py-1 text-xs font-medium text-steel-600 hover:bg-steel-100 transition-colors"
          >
            {t('common.edit')}
          </button>
          <button
            onClick={() => handleDelete(worker)}
            className="px-2 py-1 text-xs font-medium text-clay-600 hover:bg-clay-50 transition-colors"
          >
            {t('common.delete')}
          </button>
        </div>
      </td>
    </tr>
  );

  const WorkerSection = ({ title, workers, color }: { title: string; workers: Worker[]; color: string }) => {
    if (workers.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 ${color}`}></div>
          <h3 className="text-xs font-bold text-steel-600 uppercase tracking-wider">
            {title}
          </h3>
          <span className="text-xs font-mono text-steel-400">({workers.length})</span>
        </div>
        <div className="card-sharp overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-steel-50 text-left">
                <th className="py-2 px-4 text-xs font-semibold text-steel-500 uppercase">{t('workers.name')}</th>
                <th className="py-2 px-4 text-xs font-semibold text-steel-500 uppercase">{t('workers.role')}</th>
                <th className="py-2 px-4 text-xs font-semibold text-steel-500 uppercase">{t('workers.type')}</th>
                <th className="py-2 px-4 text-xs font-semibold text-steel-500 uppercase">{t('workers.start')}</th>
                <th className="py-2 px-4 text-xs font-semibold text-steel-500 uppercase">{t('workers.end')}</th>
                <th className="py-2 px-4 text-xs font-semibold text-steel-500 uppercase">{t('workers.flags')}</th>
                <th className="py-2 px-4 text-xs font-semibold text-steel-500 uppercase">{t('workers.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => <WorkerRow key={w.id} worker={w} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-steel-500">
            {t('workers.showingActive')} <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong>
          </span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as WorkerRole | 'all')}
            className="border border-steel-200 px-2 py-1 text-sm bg-white focus:outline-none focus:border-clinic-500"
          >
            <option value="all">{t('workers.allRoles')}</option>
            <option value="senior_specialist">{t('workers.seniorSpecialists')}</option>
            <option value="resident">{t('workers.residents')}</option>
            <option value="student">{t('workers.students')}</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as WorkerType | 'all')}
            className="border border-steel-200 px-2 py-1 text-sm bg-white focus:outline-none focus:border-clinic-500"
          >
            <option value="all">{t('workers.allTypes')}</option>
            <option value="permanent">{t('workers.permanent')}</option>
            <option value="external">{t('workers.external')}</option>
          </select>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-clinic-500 text-white font-semibold text-sm hover:bg-clinic-600 transition-colors shadow-sharp"
        >
          {t('workers.addPersonnel')}
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-6 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-clay-500"></div>
          <span className="text-steel-600">{seniorSpecialists.length} {t('workers.supervisorsLabel')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-steel-400"></div>
          <span className="text-steel-600">{residents.length} {t('workers.residentsLabel')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-clinic-500"></div>
          <span className="text-steel-600">{students.length} {t('workers.studentsLabel')}</span>
        </div>
      </div>

      {/* Worker Lists */}
      {(roleFilter === 'all' || roleFilter === 'senior_specialist') && (
        <WorkerSection title={t('workers.seniorSpecialistsSupervisors')} workers={seniorSpecialists} color="bg-clay-500" />
      )}
      {(roleFilter === 'all' || roleFilter === 'resident') && (
        <WorkerSection title={t('workers.residentsFirstSecond')} workers={residents} color="bg-steel-400" />
      )}
      {(roleFilter === 'all' || roleFilter === 'student') && (
        <WorkerSection title={t('workers.studentsSecondThird')} workers={students} color="bg-clinic-500" />
      )}

      {filteredWorkers.length === 0 && (
        <div className="text-center py-12 text-steel-500">
          {t('workers.noPersonnel')} {monthNames[selectedMonth - 1]} {selectedYear}.
        </div>
      )}

      {/* Worker Form Modal */}
      {showForm && (
        <WorkerForm
          worker={editingWorker}
          onClose={handleFormClose}
          onSave={handleFormSave}
          clinicId={clinicId}
        />
      )}

      {/* Availability Editor Modal */}
      {availabilityWorker && (
        <AvailabilityEditor
          worker={availabilityWorker}
          year={selectedYear}
          onClose={() => setAvailabilityWorker(null)}
        />
      )}
    </div>
  );
}
