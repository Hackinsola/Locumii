// Money is stored and transmitted as integer kobo (1 Naira = 100 kobo) to avoid
// floating-point errors. These helpers convert to/from the Naira shown in the UI.
// Pure functions only — no side effects, no imports.

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
