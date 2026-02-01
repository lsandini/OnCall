import { useState, useEffect } from 'react';
import { Worker, MonthlySchedule } from './types';
import { useApi } from './hooks/useApi';
import { MONTH_NAMES } from './utils/helpers';
import WorkersTab from './components/WorkersTab';
import ScheduleTab from './components/ScheduleTab';
import ConfigurationTab from './components/ConfigurationTab';

type TabType = 'workers' | 'schedule' | 'configuration';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('workers');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [schedules, setSchedules] = useState<MonthlySchedule[]>([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(1);

  const api = useApi();

  useEffect(() => {
    loadWorkers();
    loadSchedules();
  }, []);

  const loadWorkers = async () => {
    try {
      const data = await api.getWorkers();
      setWorkers(data);
    } catch (e) {
      console.error('Failed to load workers', e);
    }
  };

  const loadSchedules = async () => {
    try {
      const data = await api.getSchedules();
      setSchedules(data);
    } catch (e) {
      console.error('Failed to load schedules', e);
    }
  };

  const currentSchedule = schedules.find(
    s => s.year === selectedYear && s.month === selectedMonth
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b-2 border-steel-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-clinic-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">+</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-steel-900 tracking-tight">ONCALL</h1>
                <p className="text-xs text-steel-500 font-mono uppercase tracking-wider">Internal Medicine Scheduling</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="border-2 border-steel-200 px-3 py-1.5 font-medium bg-white focus:outline-none focus:border-clinic-500"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border-2 border-steel-200 px-3 py-1.5 font-medium bg-white focus:outline-none focus:border-clinic-500"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-steel-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('workers')}
              className={`py-4 px-1 text-sm font-semibold uppercase tracking-wide transition-colors ${
                activeTab === 'workers'
                  ? 'tab-active'
                  : 'text-steel-500 hover:text-steel-700 border-b-2 border-transparent'
              }`}
            >
              Personnel Management
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`py-4 px-1 text-sm font-semibold uppercase tracking-wide transition-colors ${
                activeTab === 'schedule'
                  ? 'tab-active'
                  : 'text-steel-500 hover:text-steel-700 border-b-2 border-transparent'
              }`}
            >
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear} Schedule
            </button>
            <button
              onClick={() => setActiveTab('configuration')}
              className={`py-4 px-1 text-sm font-semibold uppercase tracking-wide transition-colors ${
                activeTab === 'configuration'
                  ? 'tab-active'
                  : 'text-steel-500 hover:text-steel-700 border-b-2 border-transparent'
              }`}
            >
              Configuration
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'workers' && (
          <WorkersTab
            workers={workers}
            onWorkersChange={loadWorkers}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        )}
        {activeTab === 'schedule' && (
          <ScheduleTab
            workers={workers}
            schedule={currentSchedule}
            year={selectedYear}
            month={selectedMonth}
            onScheduleChange={loadSchedules}
          />
        )}
        {activeTab === 'configuration' && (
          <ConfigurationTab />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-steel-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-steel-400 font-mono">
            ONCALL v1.0 // Internal Medicine Clinic // {workers.filter(w => w.active).length} active personnel
          </p>
        </div>
      </footer>
    </div>
  );
}
