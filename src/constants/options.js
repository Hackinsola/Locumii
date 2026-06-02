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
