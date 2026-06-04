// Pure validation helpers. No side effects, no async, no imports from
// hooks/lib/store (importing shared constants is allowed).
import { ACCEPTED_DOC_MIME_TYPES, MAX_DOC_SIZE_BYTES } from '@/constants/options';

// Council registration number formats per specialty, from
// Feature-specs/04-professional-profile.md. The professional_profiles.specialty
// enum value is the key.
const COUNCIL_REG_PATTERNS = {
  doctor: /^MDC\/\d{4}\/\d+$/,
  pharmacist: /^PCN\/\d{4}\/\d+$/,
  nurse: /^NM\/\d{4}\/\d+$/,
  medical_lab_scientist: /^MLS\/\d{4}\/\d+$/,
};

// Human-readable format hint per specialty, for inline error messages.
export const COUNCIL_REG_HINTS = {
  doctor: 'MDC/YYYY/NNNNN',
  pharmacist: 'PCN/YYYY/NNNNN',
  nurse: 'NM/YYYY/NNNNN',
  medical_lab_scientist: 'MLS/YYYY/NNNNN',
};

// True when the registration number matches the format for the given specialty.
// Returns false for an unknown/empty specialty so the specialty field surfaces
// its own error instead.
export function validateCouncilRegNumber(specialty, number) {
  const pattern = COUNCIL_REG_PATTERNS[specialty];
  if (!pattern) {
    return false;
  }
  return pattern.test((number ?? '').trim());
}

// True when the CAC registration number matches the Nigerian format: RC or BN
// followed by 5–10 digits (Feature-specs/05-facility-profile.md). Case-insensitive.
export function validateCACNumber(cac) {
  return /^(RC|BN)\d{5,10}$/i.test((cac ?? '').trim());
}

// True for a Nigerian mobile number: local 11-digit form (0 then 7/8/9) or the
// +234 international equivalent. Mirrors the registration phone check.
export function validateNigerianPhone(phone) {
  return /^(0[789]\d{9}|\+234[789]\d{9})$/.test((phone ?? '').trim());
}

// Validates a credential file against what the private `credentials` Storage
// bucket accepts (PDF/PNG/JPEG, ≤10 MB — migration 012, mirrored in options.js).
// Returns an error message string, or null when the file is acceptable.
export function validateFileUpload(file) {
  if (!file) {
    return 'Select a file.';
  }
  if (!ACCEPTED_DOC_MIME_TYPES.includes(file.type)) {
    return 'File must be a PDF, PNG, or JPEG.';
  }
  if (file.size > MAX_DOC_SIZE_BYTES) {
    return 'File must be 10 MB or smaller.';
  }
  return null;
}
