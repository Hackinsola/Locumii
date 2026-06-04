// Pure helpers for building an iCalendar (.ics) event string for a confirmed
// shift. No side effects: the caller renders the string as a data: URL on an
// <a download> link, so no DOM manipulation happens here.

// ISO timestamp -> iCalendar UTC basic format, e.g. 20260608T090000Z.
function toIcsDate(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Escape reserved iCalendar text characters (backslash, semicolon, comma, newline).
function escapeIcsText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Builds a single-event VCALENDAR string for a confirmed shift.
export function buildShiftIcs({ id, summary, startTime, endTime, location }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Locumii//Shifts//EN',
    'BEGIN:VEVENT',
    `UID:${id}@locumii`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(startTime)}`,
    `DTEND:${toIcsDate(endTime)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
  ];
  if (location) {
    lines.push(`LOCATION:${escapeIcsText(location)}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

// A data: URL suitable for an <a href download> link.
export function shiftIcsHref(shift) {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildShiftIcs(shift))}`;
}
