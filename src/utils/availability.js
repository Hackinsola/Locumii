// Weekly-availability helpers shared by the Availability screen and the profile
// calendar. The schedule is stored on professional_profiles.availability as
// { mon: { on, start, end }, ... }; an empty object means "not set yet".

export const WEEK_DAYS = [
  { key: 'mon', short: 'Mon', label: 'Monday' },
  { key: 'tue', short: 'Tue', label: 'Tuesday' },
  { key: 'wed', short: 'Wed', label: 'Wednesday' },
  { key: 'thu', short: 'Thu', label: 'Thursday' },
  { key: 'fri', short: 'Fri', label: 'Friday' },
  { key: 'sat', short: 'Sat', label: 'Saturday' },
  { key: 'sun', short: 'Sun', label: 'Sunday' },
];

// Sensible starting point: weekdays on (09:00–17:00), weekend off.
export const DEFAULT_SCHEDULE = {
  mon: { on: true, start: '09:00', end: '17:00' },
  tue: { on: true, start: '09:00', end: '17:00' },
  wed: { on: true, start: '09:00', end: '17:00' },
  thu: { on: true, start: '09:00', end: '17:00' },
  fri: { on: true, start: '09:00', end: '17:00' },
  sat: { on: false, start: '09:00', end: '13:00' },
  sun: { on: false, start: '09:00', end: '13:00' },
};

// Merges a stored (possibly empty/partial) availability object onto the defaults so
// the UI always has all seven days with valid times.
export function normalizeSchedule(availability) {
  const result = {};
  for (const day of WEEK_DAYS) {
    const stored = availability?.[day.key];
    const fallback = DEFAULT_SCHEDULE[day.key];
    result[day.key] = {
      on: typeof stored?.on === 'boolean' ? stored.on : fallback.on,
      start: stored?.start ?? fallback.start,
      end: stored?.end ?? fallback.end,
    };
  }
  return result;
}

// True once the professional has saved any availability (non-empty object).
export function hasAvailability(availability) {
  return Boolean(availability) && Object.keys(availability).length > 0;
}

// JS getDay() is 0=Sun..6=Sat; map to our weekday keys.
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export function dayKeyOf(date) {
  return DAY_KEYS[date.getDay()];
}

// Local yyyy-mm-dd key, for matching shift start dates to calendar cells.
export function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Monday of the week containing the given date (calendars start on Monday here).
export function startOfWeekMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7; // 0 for Monday
  d.setDate(d.getDate() - offset);
  return d;
}
