/**
 * Schema Registry for Import Module
 * Defines all importable fields with metadata for schema-flexible imports
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

/**
 * Target tables for imported data
 */
export type ImportTable = 'users' | 'students' | 'enrollments' | 'bookings' | 'classes';

/**
 * Field types for parsing and validation
 */
export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'currency';

/**
 * Definition of an importable field
 */
export interface ImportableField {
  /** Internal camelCase name (e.g., "courseStartDate") */
  name: string;
  /** Display label (e.g., "Course Start Date") */
  label: string;
  /** Target database table */
  table: ImportTable;
  /** Data type for parsing */
  type: FieldType;
  /** Alternative column names that map to this field */
  aliases: string[];
  /** Is this field required for a valid row? */
  required: boolean;
  /** Can admin edit this in the preview? */
  editable: boolean;
  /** Is this an identity field (used for matching)? */
  isIdentity?: boolean;
}

/**
 * All importable fields with their metadata
 * This is the single source of truth for import schema
 */
export const IMPORTABLE_FIELDS: ImportableField[] = [
  // ============================================
  // IDENTITY FIELDS (used for matching, not editable)
  // ============================================
  {
    name: 'name',
    label: 'Name',
    table: 'users',
    type: 'string',
    aliases: ['Student Name', 'Full Name', 'Student', 'Name'],
    required: true,
    editable: false,
    isIdentity: true,
  },
  {
    name: 'email',
    label: 'Email',
    table: 'users',
    type: 'string',
    aliases: ['Email', 'Email Address', 'E-mail', 'Student Email'],
    required: false,
    editable: false,
    isIdentity: true,
  },

  // ============================================
  // STUDENT PROFILE (users/students tables)
  // ============================================
  {
    name: 'dateOfBirth',
    label: 'Date of Birth',
    table: 'users',
    type: 'date',
    aliases: ['DOB', 'Date of Birth', 'Birthday', 'Birth Date', 'Birthdate'],
    required: false,
    editable: true,
  },
  {
    name: 'nationality',
    label: 'Nationality',
    table: 'users',
    type: 'string',
    aliases: ['Nationality', 'Country', 'Country of Origin', 'Nation'],
    required: false,
    editable: true,
  },

  // ============================================
  // VISA (students table)
  // ============================================
  {
    name: 'isVisaStudent',
    label: 'Visa Student',
    table: 'students',
    type: 'boolean',
    aliases: ['Visa', 'Visa Student', 'Is Visa', 'Visa Required'],
    required: false,
    editable: true,
  },
  {
    name: 'visaType',
    label: 'Visa Type',
    table: 'students',
    type: 'string',
    aliases: ['Visa Type', 'Type of Visa', 'Visa Category'],
    required: false,
    editable: true,
  },

  // ============================================
  // COURSE/CLASS (enrollments table)
  // ============================================
  {
    name: 'courseName',
    label: 'Course',
    table: 'enrollments',
    type: 'string',
    aliases: ['Course', 'Course Name', 'Programme', 'Program', 'Course Type'],
    required: false,
    editable: true,
  },
  {
    name: 'className',
    label: 'Class',
    table: 'enrollments',
    type: 'string',
    aliases: ['Level/Class', 'Class', 'Class Name', 'Level', 'Group'],
    required: false,
    editable: true,
  },
  {
    name: 'weeks',
    label: 'Weeks',
    table: 'enrollments',
    type: 'number',
    aliases: ['Weeks', 'Week', 'Booked Weeks', 'Duration', 'Number of Weeks'],
    required: false,
    editable: true,
  },
  {
    name: 'courseStartDate',
    label: 'Start Date',
    table: 'enrollments',
    type: 'date',
    aliases: ['Start Date', 'Course Start', 'Course Start Date', 'Start', 'Begin Date'],
    required: true,
    editable: true,
  },
  {
    name: 'courseEndDate',
    label: 'End Date',
    table: 'enrollments',
    type: 'date',
    aliases: ['End Date', 'Course End', 'Course End Date', 'End', 'Finish Date'],
    required: false,
    editable: true,
  },
  {
    name: 'placementTestScore',
    label: 'Placement Test Score',
    table: 'enrollments',
    type: 'string',
    aliases: [
      'Placement Test Score',
      'Placement Test',
      'Placement Score',
      'Test Score',
      'Entry Level',
    ],
    required: false,
    editable: true,
  },

  // ============================================
  // ACCOMMODATION (bookings table)
  // ============================================
  {
    name: 'accommodationType',
    label: 'Accommodation Type',
    table: 'bookings',
    type: 'string',
    aliases: ['Accom Type', 'Accommodation Type', 'Accommodation', 'Housing Type'],
    required: false,
    editable: true,
  },
  {
    name: 'accommodationStartDate',
    label: 'Accommodation Start',
    table: 'bookings',
    type: 'date',
    aliases: ['Accommodation Start Date', 'Accom Start', 'Housing Start'],
    required: false,
    editable: true,
  },
  {
    name: 'accommodationEndDate',
    label: 'Accommodation End',
    table: 'bookings',
    type: 'date',
    aliases: ['Accommodation End Date', 'Accom End', 'Housing End'],
    required: false,
    editable: true,
  },

  // ============================================
  // FINANCIAL (bookings table)
  // ============================================
  {
    name: 'saleDate',
    label: 'Sale Date',
    table: 'bookings',
    type: 'date',
    aliases: ['Sale Date', 'Booking Date', 'Order Date', 'Purchase Date'],
    required: false,
    editable: true,
  },
  {
    name: 'agencyName',
    label: 'Agency/Source',
    table: 'bookings',
    type: 'string',
    aliases: ['Source', 'Agency', 'Sales Source', 'Agent', 'Booking Source'],
    required: false,
    editable: true,
  },
  {
    name: 'depositPaidEur',
    label: 'Deposit Paid',
    table: 'bookings',
    type: 'currency',
    aliases: ['Deposit Paid', 'Deposit', 'Initial Payment'],
    required: false,
    editable: true,
  },
  {
    name: 'totalPaidEur',
    label: 'Total Paid',
    table: 'bookings',
    type: 'currency',
    aliases: ['Paid', 'Total Paid', 'Amount Paid', 'Payment Received'],
    required: false,
    editable: true,
  },
  {
    name: 'courseFeeEur',
    label: 'Course Fee',
    table: 'bookings',
    type: 'currency',
    aliases: ['Course Fee Due', 'Course Fee', 'Tuition Fee', 'Tuition'],
    required: false,
    editable: true,
  },
  {
    name: 'accommodationFeeEur',
    label: 'Accommodation Fee',
    table: 'bookings',
    type: 'currency',
    aliases: ['Accomodation', 'Accommodation Fee', 'Accom Fee', 'Housing Fee'],
    required: false,
    editable: true,
  },
  {
    name: 'transferFeeEur',
    label: 'Transfer Fee',
    table: 'bookings',
    type: 'currency',
    aliases: ['Transfer', 'Transfer Fee', 'Airport Transfer'],
    required: false,
    editable: true,
  },
  {
    name: 'examFeeEur',
    label: 'Exam Fee',
    table: 'bookings',
    type: 'currency',
    aliases: ['Exam Fee', 'Exam', 'Examination Fee'],
    required: false,
    editable: true,
  },
  {
    name: 'registrationFeeEur',
    label: 'Registration Fee',
    table: 'bookings',
    type: 'currency',
    aliases: ['Registration Fee', 'Registration', 'Enrollment Fee'],
    required: false,
    editable: true,
  },
  {
    name: 'learnerProtectionFeeEur',
    label: 'Learner Protection',
    table: 'bookings',
    type: 'currency',
    aliases: ['Learner Protection', 'Learner Protection Fee', 'LPF'],
    required: false,
    editable: true,
  },
  {
    name: 'medicalInsuranceFeeEur',
    label: 'Medical Insurance',
    table: 'bookings',
    type: 'currency',
    aliases: ['Medical Insurance', 'Insurance', 'Health Insurance'],
    required: false,
    editable: true,
  },
  {
    name: 'totalBookingEur',
    label: 'Total Booking',
    table: 'bookings',
    type: 'currency',
    aliases: ['Total Booking', 'Total', 'Booking Total', 'Total Amount'],
    required: false,
    editable: true,
  },
  {
    name: 'totalDueEur',
    label: 'Total Due',
    table: 'bookings',
    type: 'currency',
    aliases: ['Total Booking Due', 'Amount Due', 'Outstanding', 'Balance Due'],
    required: false,
    editable: true,
  },

  // ============================================
  // LEGACY/COMPATIBILITY
  // ============================================
  {
    name: 'includeOnRegister',
    label: 'Include on Register',
    table: 'enrollments',
    type: 'boolean',
    aliases: [
      'Include On Register',
      'On Register',
      'Register',
      'XXX',
      'XXX Counter',
      'Register Flag',
    ],
    required: false,
    editable: true,
  },
];

/**
 * Map of field names to their definitions for quick lookup
 */
export const FIELD_MAP = new Map<string, ImportableField>(
  IMPORTABLE_FIELDS.map(field => [field.name, field])
);

/**
 * Get all required fields
 */
export function getRequiredFields(): ImportableField[] {
  return IMPORTABLE_FIELDS.filter(field => field.required);
}

/**
 * Get all editable fields
 */
export function getEditableFields(): ImportableField[] {
  return IMPORTABLE_FIELDS.filter(field => field.editable);
}

/**
 * Get identity fields (used for matching)
 */
export function getIdentityFields(): ImportableField[] {
  return IMPORTABLE_FIELDS.filter(field => field.isIdentity);
}

/**
 * Get fields by table
 */
export function getFieldsByTable(table: ImportTable): ImportableField[] {
  return IMPORTABLE_FIELDS.filter(field => field.table === table);
}

/**
 * Get field by name
 */
export function getField(name: string): ImportableField | undefined {
  return FIELD_MAP.get(name);
}

/**
 * Build normalized alias lookup map
 * Maps lowercase trimmed aliases to field names
 */
export function buildAliasMap(): Map<string, string> {
  const map = new Map<string, string>();

  for (const field of IMPORTABLE_FIELDS) {
    // Add the display label
    map.set(normalizeForMatching(field.label), field.name);

    // Add all aliases
    for (const alias of field.aliases) {
      map.set(normalizeForMatching(alias), field.name);
    }
  }

  return map;
}

/**
 * Normalize a string for matching (lowercase, trim, remove special chars)
 */
export function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}
