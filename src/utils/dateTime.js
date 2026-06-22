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

const dateFormat = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// Short weekday + day + month, e.g. "Tue, 23 Jun" — for the job-card meta row.
const shiftDateFormat = new Intl.DateTimeFormat('en-NG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

// Long date with year, e.g. "Tue, 23 Jun 2026" — for the shift-detail info grid.
const longDateFormat = new Intl.DateTimeFormat('en-NG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// e.g. "8 Jun 2026" — for ratings dates and "member since" lines.
export function formatDate(iso) {
  if (!iso) {
    return '';
  }
  try {
    return dateFormat.format(new Date(iso));
  } catch {
    return '';
  }
}

export function formatDateTime(iso) {
  if (!iso) {
    return '';
  }
  try {
    return dateTimeFormat.format(new Date(iso));
  } catch {
    return '';
  }
}

// e.g. "Mon, 8 Jun, 9:00 AM – 5:00 PM"
export function formatShiftRange(startIso, endIso) {
  if (!startIso || !endIso) {
    return '';
  }
  try {
    return `${dateTimeFormat.format(new Date(startIso))} – ${timeFormat.format(new Date(endIso))}`;
  } catch {
    return '';
  }
}

// e.g. "Tue, 23 Jun" — the date half of a job card's meta row.
export function formatShiftDate(iso) {
  if (!iso) {
    return '';
  }
  try {
    return shiftDateFormat.format(new Date(iso));
  } catch {
    return '';
  }
}

// e.g. "Tue, 23 Jun 2026" — the date tile on the shift-detail screen.
export function formatLongDate(iso) {
  if (!iso) {
    return '';
  }
  try {
    return longDateFormat.format(new Date(iso));
  } catch {
    return '';
  }
}

// e.g. "9:00 AM – 5:00 PM" — the time half of a job card's meta row, and the
// time tile on the shift-detail screen (start date is shown separately).
export function formatTimeRange(startIso, endIso) {
  if (!startIso || !endIso) {
    return '';
  }
  try {
    return `${timeFormat.format(new Date(startIso))} – ${timeFormat.format(new Date(endIso))}`;
  } catch {
    return '';
  }
}

// Shift length in hours as a number, e.g. 4 or 4.5. Returns 0 for invalid input.
export function shiftDurationHours(startIso, endIso) {
  if (!startIso || !endIso) {
    return 0;
  }
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) {
    return 0;
  }
  return Math.round((ms / 3_600_000) * 10) / 10;
}

// "4h" / "4.5h" — compact duration label for the card meta and detail grid.
export function formatDurationHours(startIso, endIso) {
  const hours = shiftDurationHours(startIso, endIso);
  return `${hours}h`;
}

// Countdown to a future time, e.g. "Starts in 2 days 4 hrs", "Starts in 3 hrs",
// "Starting now" once it's in the past. For the dashboard upcoming-shift card.
export function formatCountdown(iso) {
  if (!iso) {
    return '';
  }
  try {
    const diffMs = new Date(iso).getTime() - Date.now();
    if (diffMs <= 0) {
      return 'Starting now';
    }
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) {
      return `Starts in ${days} day${days === 1 ? '' : 's'}${hours > 0 ? ` ${hours} hr${hours === 1 ? '' : 's'}` : ''}`;
    }
    if (hours > 0) {
      return `Starts in ${hours} hr${hours === 1 ? '' : 's'}${minutes > 0 ? ` ${minutes} min` : ''}`;
    }
    return `Starts in ${minutes} min`;
  } catch {
    return '';
  }
}

// Coarse "time ago" label for the notification feed, e.g. "just now", "5 min ago",
// "2 hrs ago", "3 days ago". Falls back to a date for anything older than a week.
export function formatRelativeTime(iso) {
  if (!iso) {
    return '';
  }
  try {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) {
      return 'just now';
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
    }
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    return formatDate(iso);
  } catch {
    return '';
  }
}
