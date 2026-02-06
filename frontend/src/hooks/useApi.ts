import { useState, useCallback } from 'react';
import { Worker, WeeklyAvailability, MonthlySchedule, CalendarWeek, ShiftConfiguration, Holiday } from '../types';

const API_BASE = '/api';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJson = useCallback(async <T>(url: string, options?: RequestInit): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (res.status === 204) return {} as T;
      return await res.json();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // Workers
  const getWorkers = useCallback(() => fetchJson<Worker[]>('/workers'), [fetchJson]);

  const createWorker = useCallback((worker: Partial<Worker>) =>
    fetchJson<Worker>('/workers', { method: 'POST', body: JSON.stringify(worker) }), [fetchJson]);

  const updateWorker = useCallback((id: string, worker: Partial<Worker>) =>
    fetchJson<Worker>(`/workers/${id}`, { method: 'PUT', body: JSON.stringify(worker) }), [fetchJson]);

  const deleteWorker = useCallback((id: string) =>
    fetchJson(`/workers/${id}`, { method: 'DELETE' }), [fetchJson]);

  // Availability
  const getAvailability = useCallback(() => fetchJson<WeeklyAvailability[]>('/availability'), [fetchJson]);

  const getWorkerAvailability = useCallback((workerId: string) =>
    fetchJson<WeeklyAvailability[]>(`/availability/worker/${workerId}`), [fetchJson]);

  const setAvailability = useCallback((entry: WeeklyAvailability) =>
    fetchJson<WeeklyAvailability>('/availability', { method: 'POST', body: JSON.stringify(entry) }), [fetchJson]);

  const batchSetAvailability = useCallback((entries: WeeklyAvailability[]) =>
    fetchJson('/availability/batch', { method: 'POST', body: JSON.stringify({ entries }) }), [fetchJson]);

  // Schedules
  const getSchedules = useCallback(() => fetchJson<MonthlySchedule[]>('/schedules'), [fetchJson]);

  const getSchedule = useCallback((year: number, month: number) =>
    fetchJson<MonthlySchedule>(`/schedules/${year}/${month}`), [fetchJson]);

  const generateSchedule = useCallback((year: number, month: number) =>
    fetchJson<MonthlySchedule>('/schedules/generate', {
      method: 'POST',
      body: JSON.stringify({ year, month })
    }), [fetchJson]);

  const fillScheduleGaps = useCallback((year: number, month: number) =>
    fetchJson<MonthlySchedule>('/schedules/fill-gaps', {
      method: 'POST',
      body: JSON.stringify({ year, month })
    }), [fetchJson]);

  const updateAssignment = useCallback((year: number, month: number, assignmentId: string, workerId: string) =>
    fetchJson(`/schedules/${year}/${month}/assignment/${assignmentId}`, {
      method: 'PUT',
      body: JSON.stringify({ workerId })
    }), [fetchJson]);

  // Calendar
  const getWeeks = useCallback((year: number) =>
    fetchJson<CalendarWeek[]>(`/calendar/weeks/${year}`), [fetchJson]);

  // Configuration
  const getConfiguration = useCallback(() =>
    fetchJson<ShiftConfiguration>('/config'), [fetchJson]);

  const getAllConfigurations = useCallback(() =>
    fetchJson<ShiftConfiguration[]>('/config/all'), [fetchJson]);

  const updateConfiguration = useCallback((id: string, config: Partial<ShiftConfiguration>) =>
    fetchJson<ShiftConfiguration>(`/config/${id}`, { method: 'PUT', body: JSON.stringify(config) }), [fetchJson]);

  const activateConfiguration = useCallback((id: string) =>
    fetchJson<ShiftConfiguration>(`/config/${id}/activate`, { method: 'PUT' }), [fetchJson]);

  // Countries & Settings
  const getCountries = useCallback(() =>
    fetchJson<{ code: string; name: string }[]>('/config/countries'), [fetchJson]);

  const getStates = useCallback((countryCode: string) =>
    fetchJson<{ code: string; name: string }[]>(`/config/countries/${countryCode}/states`), [fetchJson]);

  const getSettings = useCallback(() =>
    fetchJson<Record<string, string>>('/config/settings'), [fetchJson]);

  const updateSettings = useCallback((settings: { country: string; region?: string }) =>
    fetchJson<Record<string, string>>('/config/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }), [fetchJson]);

  // Holidays
  const getHolidays = useCallback((year: number) =>
    fetchJson<Holiday[]>(`/config/holidays/${year}`), [fetchJson]);

  const addHoliday = useCallback((date: string, name: string) =>
    fetchJson<Holiday>('/config/holidays', {
      method: 'POST',
      body: JSON.stringify({ date, name })
    }), [fetchJson]);

  const removeHoliday = useCallback((date: string) =>
    fetchJson(`/config/holidays/${date}`, { method: 'DELETE' }), [fetchJson]);

  return {
    loading,
    error,
    getWorkers,
    createWorker,
    updateWorker,
    deleteWorker,
    getAvailability,
    getWorkerAvailability,
    setAvailability,
    batchSetAvailability,
    getSchedules,
    getSchedule,
    generateSchedule,
    fillScheduleGaps,
    updateAssignment,
    getWeeks,
    getConfiguration,
    getAllConfigurations,
    updateConfiguration,
    activateConfiguration,
    getCountries,
    getStates,
    getSettings,
    updateSettings,
    getHolidays,
    addHoliday,
    removeHoliday
  };
}
