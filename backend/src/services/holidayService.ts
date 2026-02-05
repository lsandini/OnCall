import Holidays from 'date-holidays';
import { HolidayRepo } from '../repositories/holidayRepo.js';

const hd = new Holidays();

export function getSupportedCountries(): { code: string; name: string }[] {
  const countries = hd.getCountries();
  return Object.entries(countries).map(([code, name]) => ({ code, name }));
}

export function getSupportedStates(country: string): { code: string; name: string }[] | null {
  const states = hd.getStates(country);
  if (!states) return null;
  return Object.entries(states).map(([code, name]) => ({ code, name }));
}

export function fetchHolidays(
  country: string,
  state: string | undefined,
  year: number
): { date: string; name: string }[] {
  const instance = state ? new Holidays(country, state) : new Holidays(country);
  const all = instance.getHolidays(year);
  return all
    .filter(h => h.type === 'public')
    .map(h => ({
      date: h.date.split(' ')[0], // "2026-01-01 00:00:00" -> "2026-01-01"
      name: h.name
    }));
}

export function populateHolidays(
  country: string,
  state: string | undefined,
  years: number[],
  holidayRepo: HolidayRepo
): void {
  const allHolidays: { date: string; name: string }[] = [];
  for (const year of years) {
    allHolidays.push(...fetchHolidays(country, state, year));
  }
  holidayRepo.replacePublicHolidays(country, allHolidays);
}
