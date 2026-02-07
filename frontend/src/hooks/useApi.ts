import { useCallback } from 'react';
import { Worker, WeeklyAvailability, MonthlySchedule, CalendarWeek, ShiftConfiguration, Holiday, Clinic } from '../types';

const API_BASE = '/api';

export function useApi() {
  const fetchJson = useCallback(async <T>(url: string, options?: RequestInit): Promise<T> => {
    const headers: Record<string, string> = {};
    if (options?.body) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${API_BASE}${url}`, {
      headers,
      ...options
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body.error) msg = body.error;
      } catch {}
      throw new Error(msg);
    }
    if (res.status === 204) return {} as T;
    return await res.json();
  }, []);

  // Clinics
  const getClinics = useCallback(() => fetchJson<Clinic[]>('/clinics'), [fetchJson]);

  const createClinic = useCallback((name: string) =>
    fetchJson<Clinic>('/clinics', { method: 'POST', body: JSON.stringify({ name }) }), [fetchJson]);

  const updateClinic = useCallback((id: string, name: string) =>
    fetchJson<Clinic>(`/clinics/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ name }) }), [fetchJson]);

  const deleteClinic = useCallback((id: string) =>
    fetchJson(`/clinics/${encodeURIComponent(id)}`, { method: 'DELETE' }), [fetchJson]);

  const getClinicStats = useCallback((id: string) =>
    fetchJson<{ workerCount: number; configCount: number; scheduleCount: number }>(`/clinics/${encodeURIComponent(id)}/stats`), [fetchJson]);

  // Workers
  const getWorkers = useCallback((clinicId: string) =>
    fetchJson<Worker[]>(`/workers?clinicId=${encodeURIComponent(clinicId)}`), [fetchJson]);

  const createWorker = useCallback((clinicId: string, worker: Partial<Worker>) =>
    fetchJson<Worker>('/workers', { method: 'POST', body: JSON.stringify({ ...worker, clinicId }) }), [fetchJson]);

  const updateWorker = useCallback((id: string, worker: Partial<Worker>) =>
    fetchJson<Worker>(`/workers/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(worker) }), [fetchJson]);

  const deleteWorker = useCallback((id: string) =>
    fetchJson(`/workers/${encodeURIComponent(id)}`, { method: 'DELETE' }), [fetchJson]);

  // Availability
  const getAvailability = useCallback(() => fetchJson<WeeklyAvailability[]>('/availability'), [fetchJson]);

  const getWorkerAvailability = useCallback((workerId: string) =>
    fetchJson<WeeklyAvailability[]>(`/availability/worker/${encodeURIComponent(workerId)}`), [fetchJson]);

  const setAvailability = useCallback((entry: WeeklyAvailability) =>
    fetchJson<WeeklyAvailability>('/availability', { method: 'POST', body: JSON.stringify(entry) }), [fetchJson]);

  const batchSetAvailability = useCallback((entries: WeeklyAvailability[]) =>
    fetchJson('/availability/batch', { method: 'POST', body: JSON.stringify({ entries }) }), [fetchJson]);

  // Schedules
  const getSchedules = useCallback((clinicId: string) =>
    fetchJson<MonthlySchedule[]>(`/schedules?clinicId=${encodeURIComponent(clinicId)}`), [fetchJson]);

  const getSchedule = useCallback((clinicId: string, year: number, month: number) =>
    fetchJson<MonthlySchedule>(`/schedules/${year}/${month}?clinicId=${encodeURIComponent(clinicId)}`), [fetchJson]);

  const generateSchedule = useCallback((clinicId: string, year: number, month: number) =>
    fetchJson<MonthlySchedule>('/schedules/generate', {
      method: 'POST',
      body: JSON.stringify({ clinicId, year, month })
    }), [fetchJson]);

  const fillScheduleGaps = useCallback((clinicId: string, year: number, month: number) =>
    fetchJson<MonthlySchedule>('/schedules/fill-gaps', {
      method: 'POST',
      body: JSON.stringify({ clinicId, year, month })
    }), [fetchJson]);

  const updateAssignment = useCallback((clinicId: string, year: number, month: number, assignmentId: string, workerId: string) =>
    fetchJson(`/schedules/${year}/${month}/assignment/${encodeURIComponent(assignmentId)}?clinicId=${encodeURIComponent(clinicId)}`, {
      method: 'PUT',
      body: JSON.stringify({ workerId })
    }), [fetchJson]);

  // Calendar
  const getWeeks = useCallback((year: number) =>
    fetchJson<CalendarWeek[]>(`/calendar/weeks/${year}`), [fetchJson]);

  // Configuration
  const getConfiguration = useCallback((clinicId: string) =>
    fetchJson<ShiftConfiguration>(`/config?clinicId=${encodeURIComponent(clinicId)}`), [fetchJson]);

  const getAllConfigurations = useCallback((clinicId: string) =>
    fetchJson<ShiftConfiguration[]>(`/config/all?clinicId=${encodeURIComponent(clinicId)}`), [fetchJson]);

  const updateConfiguration = useCallback((id: string, config: Partial<ShiftConfiguration>) =>
    fetchJson<ShiftConfiguration>(`/config/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(config) }), [fetchJson]);

  const activateConfiguration = useCallback((id: string) =>
    fetchJson<ShiftConfiguration>(`/config/${encodeURIComponent(id)}/activate`, { method: 'PUT' }), [fetchJson]);

  // Countries & Settings
  const getCountries = useCallback(() =>
    fetchJson<{ code: string; name: string }[]>('/config/countries'), [fetchJson]);

  const getStates = useCallback((countryCode: string) =>
    fetchJson<{ code: string; name: string }[]>(`/config/countries/${encodeURIComponent(countryCode)}/states`), [fetchJson]);

  const getSettings = useCallback(() =>
    fetchJson<Record<string, string>>('/config/settings'), [fetchJson]);

  const updateSettings = useCallback((settings: { country?: string; region?: string; language?: string }) =>
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
    fetchJson(`/config/holidays/${encodeURIComponent(date)}`, { method: 'DELETE' }), [fetchJson]);

  return {
    getClinics,
    createClinic,
    updateClinic,
    deleteClinic,
    getClinicStats,
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
