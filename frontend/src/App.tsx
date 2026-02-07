import { useState, useEffect } from 'react';
import { Worker, MonthlySchedule } from './types';
import { useApi } from './hooks/useApi';
import { getMonthNames } from './utils/helpers';
import { useTranslation } from './i18n';
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
  const { t, locale, setLocale, translations } = useTranslation();
  const monthNames = getMonthNames(translations);

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
                <h1 className="text-xl font-bold text-steel-900 tracking-tight">{t('app.title')}</h1>
                <p className="text-xs text-steel-500 font-mono uppercase tracking-wider">{t('app.subtitle')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center border-2 border-steel-200">
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

              {/* Language Toggle */}
              <div className="flex border-2 border-steel-200 self-stretch">
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
            ONCALL v1.0 // {t('app.footer')} // {workers.filter(w => w.active).length} {t('app.activePersonnel')}
          </p>
          <p className="text-xs text-steel-300 font-mono mt-1">
            &copy; {new Date().getFullYear()} Lorenzo Sandini
          </p>
        </div>
      </footer>
    </div>
  );
}
