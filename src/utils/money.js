// Money is stored and transmitted as integer kobo (1 Naira = 100 kobo) to avoid
// floating-point errors. These helpers convert to/from the Naira shown in the UI.
// Pure functions only — no side effects (imports the shared COMMISSION_RATE).
import { COMMISSION_RATE } from '@/constants/fees';

const KOBO_PER_NAIRA = 100;

// Naira (number from a form field) -> integer kobo for the database.
export function nairaToKobo(naira) {
  return Math.round(Number(naira) * KOBO_PER_NAIRA);
}

// Integer kobo (from the database) -> Naira number.
export function koboToNaira(kobo) {
  return Number(kobo) / KOBO_PER_NAIRA;
}

// Integer kobo -> display string, e.g. "₦50,000".
export function formatNaira(kobo) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(koboToNaira(kobo));
}

// Integer kobo -> short display for tight stat tiles, e.g. "₦450", "₦90k",
// "₦1.25M". Guarantees money fits a 3-4 column stats row on a narrow phone;
// full precision stays everywhere else (formatNaira).
export function formatNairaCompact(kobo) {
  const naira = koboToNaira(kobo);
  const abs = Math.abs(naira);
  const trim = (text) => text.replace(/\.0+$|(\.\d*?)0+$/, '$1');
  if (abs >= 1_000_000) {
    return `₦${trim((naira / 1_000_000).toFixed(2))}M`;
  }
  if (abs >= 1_000) {
    return `₦${trim((naira / 1_000).toFixed(1))}k`;
  }
  return `₦${Math.round(naira)}`;
}

// Platform commission on a gross amount, in kobo: round(gross * COMMISSION_RATE).
// Mirrors the (not-yet-built) server-side release-payment calculation.
export function calculateCommission(grossKobo) {
  return Math.round(Number(grossKobo) * COMMISSION_RATE);
}

// Net amount the professional receives after the platform commission, in kobo
// (architecture.md: net_amount_naira = gross - commission).
export function calculateNet(grossKobo) {
  return Number(grossKobo) - calculateCommission(grossKobo);
}
