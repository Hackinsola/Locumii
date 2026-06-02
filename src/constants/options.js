// Shared option lists for forms. Values must match the database enum/columns;
// labels are what the user sees.

// professional_profiles.specialty enum -> display label.
export const PROFESSIONAL_SPECIALTIES = [
  { value: 'doctor', label: 'Medical Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'medical_lab_scientist', label: 'Medical Laboratory Scientist' },
];

// The six FCT area councils. MVP launch geography is Abuja/FCT only; expand for
// Lagos in Phase 2. Used for professional_profiles.preferred_cities.
export const FCT_CITIES = [
  'Abuja Municipal (AMAC)',
  'Bwari',
  'Gwagwalada',
  'Kuje',
  'Kwali',
  'Abaji',
];

// facility_profiles.facility_type enum -> display label.
export const FACILITY_TYPES = [
  { value: 'clinic', label: 'Clinic' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'diagnostic_lab', label: 'Diagnostic Laboratory' },
];

// credentials.doc_type enum -> display label. All three are required for review.
export const CREDENTIAL_DOC_TYPES = [
  { value: 'mdcn_license', label: 'MDCN / Council License' },
  { value: 'nysc_cert', label: 'NYSC Certificate' },
  { value: 'government_id', label: 'Government-issued ID' },
];

// Mirrors the credentials Storage bucket's allowed_mime_types and file_size_limit.
export const ACCEPTED_DOC_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
export const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
