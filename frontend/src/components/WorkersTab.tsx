import { useState } from 'react';
import { Worker, WorkerRole, WorkerType } from '../types';
import { useApi } from '../hooks/useApi';
import { ROLE_LABELS } from '../utils/helpers';
import WorkerForm from './WorkerForm';
import AvailabilityEditor from './AvailabilityEditor';

interface Props {
  workers: Worker[];
  onWorkersChange: () => void;
  selectedYear: number;
}

export default function WorkersTab({ workers, onWorkersChange, selectedYear }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [availabilityWorker, setAvailabilityWorker] = useState<Worker | null>(null);
  const [roleFilter, setRoleFilter] = useState<WorkerRole | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<WorkerType | 'all'>('all');

  const api = useApi();

  const filteredWorkers = workers.filter(w => {
    if (!w.active) return false;
    if (roleFilter !== 'all' && w.role !== roleFilter) return false;
    if (typeFilter !== 'all' && w.type !== typeFilter) return false;
    return true;
  });

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setShowForm(true);
  };

  const handleDelete = async (worker: Worker) => {
    if (!confirm(`Deactivate ${worker.name}?`)) return;
    try {
      await api.deleteWorker(worker.id);
      onWorkersChange();
    } catch (e) {
      alert('Failed to delete worker');
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

  // Group workers by role
  const seniorSpecialists = filteredWorkers.filter(w => w.role === 'senior_specialist');
  const residents = filteredWorkers.filter(w => w.role === 'resident');
  const students = filteredWorkers.filter(w => w.role === 'student');

  const WorkerCard = ({ worker }: { worker: Worker }) => (
    <div className="card-sharp p-4 transition-all hover:-translate-y-0.5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-steel-900">{worker.name}</h4>
          <p className="text-xs text-steel-500 font-mono uppercase">
            {ROLE_LABELS[worker.role]}
            {worker.yearOfStudy && ` // Year ${worker.yearOfStudy}`}
          </p>
        </div>
        {worker.type === 'external' && (
          <span className="badge bg-amber-50 border-amber-300 text-amber-700">
            EXT
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-steel-500 mb-3">
        {worker.canDoubleSift && (
          <span className="badge bg-clinic-50 border-clinic-300 text-clinic-700">
            Double Shifts
          </span>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-steel-100">
        <button
          onClick={() => setAvailabilityWorker(worker)}
          className="flex-1 px-3 py-1.5 text-xs font-semibold text-clinic-700 bg-clinic-50 border border-clinic-200 hover:bg-clinic-100 transition-colors"
        >
          Availability
        </button>
        <button
          onClick={() => handleEdit(worker)}
          className="px-3 py-1.5 text-xs font-semibold text-steel-600 bg-steel-50 border border-steel-200 hover:bg-steel-100 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => handleDelete(worker)}
          className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );

  const WorkerSection = ({ title, workers, color }: { title: string; workers: Worker[]; color: string }) => (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 ${color}`}></div>
        <h3 className="text-sm font-bold text-steel-700 uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-xs font-mono text-steel-400">({workers.length})</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map(w => <WorkerCard key={w.id} worker={w} />)}
      </div>
    </div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as WorkerRole | 'all')}
            className="border-2 border-steel-200 px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:border-clinic-500"
          >
            <option value="all">All Roles</option>
            <option value="senior_specialist">Senior Specialists</option>
            <option value="resident">Residents</option>
            <option value="student">Students</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as WorkerType | 'all')}
            className="border-2 border-steel-200 px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:border-clinic-500"
          >
            <option value="all">All Types</option>
            <option value="permanent">Permanent</option>
            <option value="external">External</option>
          </select>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-clinic-500 text-white font-semibold text-sm hover:bg-clinic-600 transition-colors shadow-sharp"
        >
          + Add Personnel
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card-sharp p-4">
          <div className="text-2xl font-bold text-steel-900 font-mono">{seniorSpecialists.length}</div>
          <div className="text-xs text-steel-500 uppercase tracking-wide">Supervisors</div>
        </div>
        <div className="card-sharp p-4">
          <div className="text-2xl font-bold text-steel-900 font-mono">{residents.length}</div>
          <div className="text-xs text-steel-500 uppercase tracking-wide">Residents</div>
        </div>
        <div className="card-sharp p-4">
          <div className="text-2xl font-bold text-steel-900 font-mono">{students.length}</div>
          <div className="text-xs text-steel-500 uppercase tracking-wide">Students</div>
        </div>
        <div className="card-sharp p-4">
          <div className="text-2xl font-bold text-steel-900 font-mono">
            {workers.filter(w => w.active && w.type === 'external').length}
          </div>
          <div className="text-xs text-steel-500 uppercase tracking-wide">Externals</div>
        </div>
      </div>

      {/* Worker Lists */}
      {(roleFilter === 'all' || roleFilter === 'senior_specialist') && seniorSpecialists.length > 0 && (
        <WorkerSection title="Senior Specialists (Supervisors)" workers={seniorSpecialists} color="bg-rose-500" />
      )}

      {(roleFilter === 'all' || roleFilter === 'resident') && residents.length > 0 && (
        <WorkerSection title="Residents (1st/2nd Line)" workers={residents} color="bg-sky-500" />
      )}

      {(roleFilter === 'all' || roleFilter === 'student') && students.length > 0 && (
        <WorkerSection title="Medical Students (2nd/3rd Line)" workers={students} color="bg-emerald-500" />
      )}

      {filteredWorkers.length === 0 && (
        <div className="text-center py-12 text-steel-500">
          No personnel found with current filters.
        </div>
      )}

      {/* Worker Form Modal */}
      {showForm && (
        <WorkerForm
          worker={editingWorker}
          onClose={handleFormClose}
          onSave={handleFormSave}
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
