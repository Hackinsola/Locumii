// Pure date/time formatting helpers for shift display. Times render in the
// browser's locale; shifts are same-day, so a range shows the start date and the
// start–end clock times.

const dateTimeFormat = new Intl.DateTimeFormat('en-NG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const timeFormat = new Intl.DateTimeFormat('en-NG', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function formatDateTime(iso) {
  if (!iso) {
    return '';
  }
  return dateTimeFormat.format(new Date(iso));
}

// e.g. "Mon, 8 Jun, 9:00 AM – 5:00 PM"
export function formatShiftRange(startIso, endIso) {
  if (!startIso || !endIso) {
    return '';
  }
  return `${dateTimeFormat.format(new Date(startIso))} – ${timeFormat.format(new Date(endIso))}`;
}
