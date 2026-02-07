import { useState, useEffect } from 'react';
import { Worker, MonthlySchedule, Clinic } from './types';
import { useApi } from './hooks/useApi';
import { getMonthNames, getClinicDisplayName } from './utils/helpers';
import { useTranslation } from './i18n';
import WorkersTab from './components/WorkersTab';
import ScheduleTab from './components/ScheduleTab';
import ConfigurationTab from './components/ConfigurationTab';
import AdminTab from './components/AdminTab';

type TabType = 'workers' | 'schedule' | 'configuration' | 'admin';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('workers');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [schedules, setSchedules] = useState<MonthlySchedule[]>([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>(() =>
    localStorage.getItem('selectedClinicId') || ''
  );
  const [adminMode, setAdminMode] = useState(() =>
    localStorage.getItem('adminMode') === 'true'
  );

  const api = useApi();
  const { t, locale, setLocale, translations } = useTranslation();
  const monthNames = getMonthNames(translations);

  // Load clinics on mount
  useEffect(() => {
    api.getClinics().then(data => {
      setClinics(data);
      if (!selectedClinicId && data.length > 0) {
        setSelectedClinicId(data[0].id);
      }
    }).catch(e => console.error('Failed to load clinics', e));
  }, []);

  // Persist clinic selection
  useEffect(() => {
    if (selectedClinicId) {
      localStorage.setItem('selectedClinicId', selectedClinicId);
    }
  }, [selectedClinicId]);

  // Reload data when clinic changes
  useEffect(() => {
    if (selectedClinicId) {
      loadWorkers();
      loadSchedules();
    }
  }, [selectedClinicId]);

  const loadWorkers = async () => {
    if (!selectedClinicId) return;
    try {
      const data = await api.getWorkers(selectedClinicId);
      setWorkers(data);
    } catch (e) {
      console.error('Failed to load workers', e);
    }
  };

  const loadSchedules = async () => {
    if (!selectedClinicId) return;
    try {
      const data = await api.getSchedules(selectedClinicId);
      setSchedules(data);
    } catch (e) {
      console.error('Failed to load schedules', e);
    }
  };

  const reloadClinics = async () => {
    try {
      const data = await api.getClinics();
      setClinics(data);
      // If selected clinic was deleted, switch to first remaining
      if (!data.find(c => c.id === selectedClinicId) && data.length > 0) {
        setSelectedClinicId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to reload clinics', e);
    }
  };

  const toggleAdminMode = () => {
    const next = !adminMode;
    setAdminMode(next);
    localStorage.setItem('adminMode', String(next));
    if (!next && (activeTab === 'admin' || activeTab === 'configuration')) {
      setActiveTab('workers');
    }
  };

  const handleSelectClinic = (id: string) => {
    setSelectedClinicId(id);
    setActiveTab('workers');
  };

  const currentSchedule = schedules.find(
    s => s.year === selectedYear && s.month === selectedMonth
  );

  const selectedClinic = clinics.find(c => c.id === selectedClinicId);

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
                <h1 className="text-xl font-bold text-steel-900 tracking-tight">{t('app.title')}</h1>
                <p className="text-xs font-mono uppercase tracking-wider">
                  <span className="text-steel-500">{t('app.subtitle')}</span>
                  {selectedClinic && activeTab !== 'admin' && (
                    <span className="text-clinic-600 font-bold"> // {getClinicDisplayName(selectedClinic.name, translations)}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Clinic Selector (hidden on admin tab) */}
              {activeTab !== 'admin' && (
                <div className="h-10 border-2 border-steel-200 pr-2 hover:bg-steel-50 transition-colors">
                  <select
                    value={selectedClinicId}
                    onChange={(e) => setSelectedClinicId(e.target.value)}
                    className="h-full pl-3 pr-1 text-sm font-semibold text-steel-900 bg-transparent cursor-pointer focus:outline-none border-none"
                  >
                    {clinics.map(c => (
                      <option key={c.id} value={c.id}>{getClinicDisplayName(c.name, translations)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Month Navigator (hidden on admin tab) */}
              {activeTab !== 'admin' && (
                <div className="flex items-center border-2 border-steel-200 h-10">
                  <button
                    onClick={() => {
                      if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
                      else setSelectedMonth(m => m - 1);
                    }}
                    className="px-3 py-1.5 text-steel-500 hover:text-steel-900 hover:bg-steel-50 font-bold text-lg transition-colors border-r-2 border-steel-200"
                    aria-label="Previous month"
                  >
                    &laquo;
                  </button>
                  <span className="px-4 py-1.5 font-semibold text-steel-900 text-sm tracking-wide min-w-[160px] text-center">
                    {monthNames[selectedMonth - 1]} {selectedYear}
                  </span>
                  <button
                    onClick={() => {
                      if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
                      else setSelectedMonth(m => m + 1);
                    }}
                    className="px-3 py-1.5 text-steel-500 hover:text-steel-900 hover:bg-steel-50 font-bold text-lg transition-colors border-l-2 border-steel-200"
                    aria-label="Next month"
                  >
                    &raquo;
                  </button>
                </div>
              )}

              {/* Language Toggle */}
              <div className="flex border-2 border-steel-200 h-10">
                <button
                  onClick={() => setLocale('en')}
                  className={`w-10 text-sm font-semibold transition-colors ${
                    locale === 'en'
                      ? 'bg-clinic-500 text-white'
                      : 'text-steel-600 hover:bg-steel-50'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLocale('fi')}
                  className={`w-10 text-sm font-semibold border-l-2 border-steel-200 transition-colors ${
                    locale === 'fi'
                      ? 'bg-clinic-500 text-white'
                      : 'text-steel-600 hover:bg-steel-50'
                  }`}
                >
                  FI
                </button>
              </div>

              {/* Admin Mode Toggle */}
              <button
                onClick={toggleAdminMode}
                className={`h-10 w-10 flex items-center justify-center border-2 transition-colors ${
                  adminMode
                    ? 'border-clinic-500 bg-clinic-500 text-white'
                    : 'border-steel-200 text-steel-400 hover:text-steel-600 hover:bg-steel-50'
                }`}
                title={t('clinic.adminTab')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
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
              {t('app.personnelTab')}
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`py-4 px-1 text-sm font-semibold uppercase tracking-wide transition-colors ${
                activeTab === 'schedule'
                  ? 'tab-active'
                  : 'text-steel-500 hover:text-steel-700 border-b-2 border-transparent'
              }`}
            >
              {monthNames[selectedMonth - 1]} {selectedYear} {t('app.scheduleTab')}
            </button>
            {adminMode && (
              <button
                onClick={() => setActiveTab('configuration')}
                className={`py-4 px-1 text-sm font-semibold uppercase tracking-wide transition-colors ${
                  activeTab === 'configuration'
                    ? 'tab-active'
                    : 'text-steel-500 hover:text-steel-700 border-b-2 border-transparent'
                }`}
              >
                {t('app.configTab')}
              </button>
            )}
            {adminMode && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`py-4 px-1 text-sm font-semibold uppercase tracking-wide transition-colors ${
                  activeTab === 'admin'
                    ? 'tab-active'
                    : 'text-steel-500 hover:text-steel-700 border-b-2 border-transparent'
                }`}
              >
                {t('clinic.adminTab')}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedClinicId && activeTab === 'workers' && (
          <WorkersTab
            workers={workers}
            onWorkersChange={loadWorkers}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            clinicId={selectedClinicId}
          />
        )}
        {selectedClinicId && activeTab === 'schedule' && (
          <ScheduleTab
            workers={workers}
            schedule={currentSchedule}
            year={selectedYear}
            month={selectedMonth}
            onScheduleChange={loadSchedules}
            clinicId={selectedClinicId}
            clinicName={selectedClinic ? getClinicDisplayName(selectedClinic.name, translations) : ''}
          />
        )}
        {selectedClinicId && activeTab === 'configuration' && (
          <ConfigurationTab clinicId={selectedClinicId} />
        )}
        {activeTab === 'admin' && (
          <AdminTab
            clinics={clinics}
            onClinicsChange={reloadClinics}
            onSelectClinic={handleSelectClinic}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-steel-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-steel-400 font-mono">
            ONCALL v1.0 // {selectedClinic ? getClinicDisplayName(selectedClinic.name, translations) : t('app.footer')} // {workers.filter(w => w.active).length} {t('app.activePersonnel')}
          </p>
          <p className="text-xs text-steel-300 font-mono mt-1">
            &copy; {new Date().getFullYear()} Lorenzo Sandini
          </p>
        </div>
      </footer>
    </div>
  );
}
