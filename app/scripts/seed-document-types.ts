/**
 * Seed Default Document Types
 *
 * Seeds the document_types table with commonly used document categories
 * for ESL schools. Admins can customize these later via the UI.
 *
 * Run: npx tsx scripts/seed-document-types.ts
 */

import { db } from '../src/db';
import { documentTypes } from '../src/db/schema';
import { eq } from 'drizzle-orm';

interface DocumentTypeSeed {
  name: string;
  category: string;
  description: string;
  adminCanUpload: boolean;
  studentCanUpload: boolean;
  requiresApproval: boolean;
  defaultVisibility: string;
  requiresExpiry: boolean;
  expiryAlertDays: number[];
  isRequired: boolean;
  displayOrder: number;
}

const defaultDocumentTypes: DocumentTypeSeed[] = [
  // ============================================================================
  // IDENTITY DOCUMENTS
  // ============================================================================
  {
    name: 'Passport Copy',
    category: 'identity',
    description: 'Copy of student passport (photo page)',
    adminCanUpload: true,
    studentCanUpload: true,  // Students can upload, requires approval
    requiresApproval: true,
    defaultVisibility: 'admin_only',
    requiresExpiry: true,
    expiryAlertDays: [180, 90, 30],  // 6 months, 3 months, 1 month
    isRequired: true,
    displayOrder: 1,
  },
  {
    name: 'National ID Card',
    category: 'identity',
    description: 'Government-issued national identity card',
    adminCanUpload: true,
    studentCanUpload: true,
    requiresApproval: true,
    defaultVisibility: 'admin_only',
    requiresExpiry: true,
    expiryAlertDays: [90, 30],
    isRequired: false,
    displayOrder: 2,
  },
  {
    name: 'Birth Certificate',
    category: 'identity',
    description: 'Official birth certificate',
    adminCanUpload: true,
    studentCanUpload: true,
    requiresApproval: true,
    defaultVisibility: 'admin_only',
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,
    displayOrder: 3,
  },

  // ============================================================================
  // VISA DOCUMENTS
  // ============================================================================
  {
    name: 'Visa Copy',
    category: 'visa',
    description: 'Current visa stamp or permit',
    adminCanUpload: true,
    studentCanUpload: true,
    requiresApproval: true,
    defaultVisibility: 'admin_only',
    requiresExpiry: true,
    expiryAlertDays: [60, 30, 14, 7],  // 2 months, 1 month, 2 weeks, 1 week
    isRequired: true,
    displayOrder: 10,
  },
  {
    name: 'IRP/GNIB Card',
    category: 'visa',
    description: 'Irish Residence Permit / Immigration card',
    adminCanUpload: true,
    studentCanUpload: true,
    requiresApproval: true,
    defaultVisibility: 'admin_only',
    requiresExpiry: true,
    expiryAlertDays: [60, 30, 14],
    isRequired: false,
    displayOrder: 11,
  },
  {
    name: 'Visa Renewal Application',
    category: 'visa',
    description: 'Copy of visa renewal application submission',
    adminCanUpload: true,
    studentCanUpload: false,
    requiresApproval: false,
    defaultVisibility: 'admin_only',
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,
    displayOrder: 12,
  },

  // ============================================================================
  // MEDICAL DOCUMENTS
  // ============================================================================
  {
    name: 'Medical Certificate',
    category: 'medical',
    description: 'Medical fitness certificate (if required)',
    adminCanUpload: true,
    studentCanUpload: true,
    requiresApproval: true,
    defaultVisibility: 'admin_only',
    requiresExpiry: true,
    expiryAlertDays: [90, 30],
    isRequired: false,
    displayOrder: 20,
  },
  {
    name: 'Vaccination Record',
    category: 'medical',
    description: 'Immunization records',
    adminCanUpload: true,
    studentCanUpload: true,
    requiresApproval: true,
    defaultVisibility: 'admin_only',
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,
    displayOrder: 21,
  },
  {
    name: 'Health Insurance Card',
    category: 'medical',
    description: 'Proof of health insurance coverage',
    adminCanUpload: true,
    studentCanUpload: true,
    requiresApproval: true,
    defaultVisibility: 'admin_only',
    requiresExpiry: true,
    expiryAlertDays: [60, 30],
    isRequired: false,
    displayOrder: 22,
  },

  // ============================================================================
  // ACADEMIC DOCUMENTS
  // ============================================================================
  {
    name: 'Diagnostic Test Report',
    category: 'academic',
    description: 'Initial placement test results and report',
    adminCanUpload: true,
    studentCanUpload: false,
    requiresApproval: false,
    defaultVisibility: 'student_can_view',  // Students can see their test results
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,
    displayOrder: 30,
  },
  {
    name: 'Unit Test Results',
    category: 'academic',
    description: 'End of unit test papers and scores',
    adminCanUpload: true,
    studentCanUpload: false,
    requiresApproval: false,
    defaultVisibility: 'staff_only',  // Teachers can see, students need explicit sharing
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,
    displayOrder: 31,
  },
  {
    name: 'Progress Report',
    category: 'academic',
    description: 'Teacher-written progress reports',
    adminCanUpload: true,
    studentCanUpload: false,
    requiresApproval: false,
    defaultVisibility: 'staff_only',
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,
    displayOrder: 32,
  },
  {
    name: 'Certificate of Completion',
    category: 'academic',
    description: 'Course completion certificate',
    adminCanUpload: true,
    studentCanUpload: false,
    requiresApproval: false,
    defaultVisibility: 'student_can_view',
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,
    displayOrder: 33,
  },
  {
    name: 'External Exam Certificate',
    category: 'academic',
    description: 'IELTS, Cambridge, TOEFL certificates',
    adminCanUpload: true,
    studentCanUpload: true,
    requiresApproval: true,
    defaultVisibility: 'student_can_view',
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,
    displayOrder: 34,
  },

  // ============================================================================
  // CORRESPONDENCE
  // ============================================================================
  {
    name: 'Parent Consent Form',
    category: 'correspondence',
    description: 'Parental consent for minors',
    adminCanUpload: true,
    studentCanUpload: true,
    requiresApproval: true,
    defaultVisibility: 'admin_only',
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,  // Only for minors
    displayOrder: 40,
  },
  {
    name: 'Withdrawal Letter',
    category: 'correspondence',
    description: 'Official withdrawal notification',
    adminCanUpload: true,
    studentCanUpload: true,
    requiresApproval: true,
    defaultVisibility: 'admin_only',
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,
    displayOrder: 41,
  },
  {
    name: 'Reference Letter',
    category: 'correspondence',
    description: 'Letter of recommendation or reference',
    adminCanUpload: true,
    studentCanUpload: false,
    requiresApproval: false,
    defaultVisibility: 'student_can_view',
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,
    displayOrder: 42,
  },
  {
    name: 'Official School Letter',
    category: 'correspondence',
    description: 'Letters to/from school administration',
    adminCanUpload: true,
    studentCanUpload: false,
    requiresApproval: false,
    defaultVisibility: 'admin_only',
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,
    displayOrder: 43,
  },

  // ============================================================================
  // OTHER
  // ============================================================================
  {
    name: 'Other Document',
    category: 'other',
    description: 'Miscellaneous documents not fitting other categories',
    adminCanUpload: true,
    studentCanUpload: true,
    requiresApproval: true,
    defaultVisibility: 'admin_only',
    requiresExpiry: false,
    expiryAlertDays: [],
    isRequired: false,
    displayOrder: 99,
  },
];

/**
 * Main seed function
 */
async function seedDocumentTypes() {
  console.log('🌱 Seeding document types...\n');

  try {
    // Get all tenants
    const tenants = await db.query.tenants.findMany({
      where: (tenants, { eq }) => eq(tenants.isActive, true),
    });

    if (tenants.length === 0) {
      console.log('⚠️  No active tenants found. Please create a tenant first.');
      return;
    }

    console.log(`Found ${tenants.length} active tenant(s)\n`);

    let totalSeeded = 0;
    let totalSkipped = 0;

    // Seed document types for each tenant
    for (const tenant of tenants) {
      console.log(`📁 Seeding document types for tenant: ${tenant.name}`);

      for (const docType of defaultDocumentTypes) {
        // Check if document type already exists
        const existing = await db.query.documentTypes.findFirst({
          where: (dt, { and, eq }) =>
            and(eq(dt.tenantId, tenant.id), eq(dt.name, docType.name)),
        });

        if (existing) {
          console.log(`   ⏭️  Skipped: ${docType.name} (already exists)`);
          totalSkipped++;
          continue;
        }

        // Insert document type
        await db.insert(documentTypes).values({
          tenantId: tenant.id,
          ...docType,
        });

        console.log(`   ✅ Created: ${docType.name}`);
        totalSeeded++;
      }

      console.log('');
    }

    console.log('========================================');
    console.log('✅ Document type seeding complete!');
    console.log(`   Created: ${totalSeeded}`);
    console.log(`   Skipped: ${totalSkipped}`);
    console.log('========================================\n');

    // Show summary by category
    console.log('📊 Summary by category:');
    const categories = [
      ...new Set(defaultDocumentTypes.map(dt => dt.category)),
    ];
    for (const category of categories) {
      const count = defaultDocumentTypes.filter(
        dt => dt.category === category
      ).length;
      console.log(`   ${category}: ${count} types`);
    }
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding document types:', error);
    process.exit(1);
  }
}

// Run seed
seedDocumentTypes();
