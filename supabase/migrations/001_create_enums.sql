-- 001_create_enums.sql
-- Shared enum types used across the Locumii schema.
-- Values are taken verbatim from project-overview.md and architecture.md.
-- No type is invented here; every value maps to a documented domain value.

-- users.role
create type user_role as enum ('professional', 'facility', 'admin');

-- users.status
create type user_status as enum ('pending', 'active', 'suspended');

-- professional_profiles.specialty (the four in-scope professional types)
create type professional_specialty as enum (
  'doctor',
  'nurse',
  'pharmacist',
  'medical_lab_scientist'
);

-- facility_profiles.facility_type (the four in-scope facility types)
create type facility_type as enum (
  'clinic',
  'hospital',
  'pharmacy',
  'diagnostic_lab'
);

-- credentials.doc_type
create type credential_doc_type as enum (
  'mdcn_license',
  'nysc_cert',
  'government_id'
);

-- credentials.status
create type credential_status as enum ('pending', 'approved', 'rejected');

-- shifts.status (state machine enforced in 006; see INV-07)
create type shift_status as enum (
  'open',
  'filled',
  'in_progress',
  'completed',
  'cancelled'
);

-- bids.status
create type bid_status as enum ('pending', 'accepted', 'rejected', 'cancelled');

-- transactions.status
create type transaction_status as enum ('escrow', 'released', 'failed');
