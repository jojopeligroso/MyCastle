/**
 * Seed Sample Students
 * Creates realistic sample student data for testing the Student Registry
 * Run with: npm run seed:students
 */

import { db } from '../src/db';
import { users, enrollments } from '../src/db/schema';
import { sql } from 'drizzle-orm';

interface SampleStudent {
  email: string;
  name: string;
  phone: string;
  current_level: string;
  initial_level: string;
  level_status: 'confirmed' | 'provisional' | 'pending_approval';
  visa_type?: string;
  visa_expiry?: string; // YYYY-MM-DD
  status: 'active' | 'inactive' | 'suspended';
  metadata: Record<string, any>;
}

const sampleStudents: SampleStudent[] = [
  // Active students with confirmed levels
  {
    email: 'maria.garcia@example.com',
    name: 'Maria Garcia',
    phone: '+34 612 345 678',
    current_level: 'B1',
    initial_level: 'A2',
    level_status: 'confirmed',
    visa_type: 'Student Visa',
    visa_expiry: '2025-08-15',
    status: 'active',
    metadata: {
      nationality: 'Spanish',
      date_of_birth: '1998-05-12',
      emergency_contact: {
        name: 'Carlos Garcia',
        phone: '+34 612 999 888',
        relationship: 'Father',
      },
      enrollment_date: '2024-09-01',
    },
  },
  {
    email: 'yuki.tanaka@example.com',
    name: 'Yuki Tanaka',
    phone: '+81 80 1234 5678',
    current_level: 'A2',
    initial_level: 'A1',
    level_status: 'confirmed',
    visa_type: 'Tier 4 Student Visa',
    visa_expiry: '2025-12-31',
    status: 'active',
    metadata: {
      nationality: 'Japanese',
      date_of_birth: '2000-03-22',
      emergency_contact: {
        name: 'Hiroshi Tanaka',
        phone: '+81 80 9999 8888',
        relationship: 'Father',
      },
      enrollment_date: '2024-10-15',
    },
  },
  {
    email: 'ahmed.hassan@example.com',
    name: 'Ahmed Hassan',
    phone: '+20 100 123 4567',
    current_level: 'C1',
    initial_level: 'B2',
    level_status: 'confirmed',
    status: 'active',
    metadata: {
      nationality: 'Egyptian',
      date_of_birth: '1995-11-08',
      emergency_contact: {
        name: 'Fatima Hassan',
        phone: '+20 100 999 8888',
        relationship: 'Mother',
      },
      enrollment_date: '2023-06-01',
    },
  },

  // Students with provisional levels (from diagnostic tests)
  {
    email: 'sophie.martin@example.com',
    name: 'Sophie Martin',
    phone: '+33 6 12 34 56 78',
    current_level: 'B2',
    initial_level: 'B2',
    level_status: 'provisional', // Needs approval
    visa_type: 'Student Visa',
    visa_expiry: '2025-06-30',
    status: 'active',
    metadata: {
      nationality: 'French',
      date_of_birth: '1999-07-14',
      emergency_contact: {
        name: 'Pierre Martin',
        phone: '+33 6 99 88 77 66',
        relationship: 'Father',
      },
      enrollment_date: '2025-01-15',
      notes: [
        {
          date: '2025-01-15T10:00:00Z',
          author_id: null, // Would be admin user ID
          content: 'Diagnostic test score: 75/100. Recommended level: B2',
          type: 'general',
        },
      ],
    },
  },
  {
    email: 'carlos.rodriguez@example.com',
    name: 'Carlos Rodriguez',
    phone: '+52 55 1234 5678',
    current_level: 'A1',
    initial_level: 'A1',
    level_status: 'provisional',
    status: 'active',
    metadata: {
      nationality: 'Mexican',
      date_of_birth: '2001-09-03',
      emergency_contact: {
        name: 'Isabel Rodriguez',
        phone: '+52 55 9999 8888',
        relationship: 'Mother',
      },
      enrollment_date: '2025-01-20',
      notes: [
        {
          date: '2025-01-20T14:30:00Z',
          author_id: null,
          content: 'Diagnostic test score: 32/100. Beginner level confirmed.',
          type: 'general',
        },
      ],
    },
  },

  // Students with visa expiring soon (compliance tracking)
  {
    email: 'li.wei@example.com',
    name: 'Li Wei',
    phone: '+86 138 0000 1234',
    current_level: 'B1',
    initial_level: 'A2',
    level_status: 'confirmed',
    visa_type: 'Tier 4 Student Visa',
    visa_expiry: '2025-02-10', // Expires soon!
    status: 'active',
    metadata: {
      nationality: 'Chinese',
      date_of_birth: '1997-12-25',
      emergency_contact: {
        name: 'Wei Chen',
        phone: '+86 138 9999 8888',
        relationship: 'Father',
      },
      enrollment_date: '2024-08-01',
    },
  },

  // Student with expired visa (at risk)
  {
    email: 'ana.silva@example.com',
    name: 'Ana Silva',
    phone: '+55 11 98765 4321',
    current_level: 'A2',
    initial_level: 'A1',
    level_status: 'confirmed',
    visa_type: 'Student Visa',
    visa_expiry: '2024-12-15', // Already expired
    status: 'suspended', // Suspended due to visa expiry
    metadata: {
      nationality: 'Brazilian',
      date_of_birth: '2000-04-18',
      emergency_contact: {
        name: 'Paulo Silva',
        phone: '+55 11 99999 8888',
        relationship: 'Father',
      },
      enrollment_date: '2024-06-01',
      notes: [
        {
          date: '2024-12-20T09:00:00Z',
          author_id: null,
          content: 'Suspended due to visa expiry. Awaiting renewal documentation.',
          type: 'safeguarding',
        },
      ],
    },
  },

  // Students without visa requirements (EU/local)
  {
    email: 'john.smith@example.com',
    name: 'John Smith',
    phone: '+44 7700 900123',
    current_level: 'B2',
    initial_level: 'B1',
    level_status: 'confirmed',
    status: 'active',
    metadata: {
      nationality: 'British',
      date_of_birth: '1992-01-30',
      emergency_contact: {
        name: 'Sarah Smith',
        phone: '+44 7700 900456',
        relationship: 'Wife',
      },
      enrollment_date: '2024-11-01',
    },
  },
  {
    email: 'emma.johnson@example.com',
    name: 'Emma Johnson',
    phone: '+1 202 555 0123',
    current_level: 'C2',
    initial_level: 'C1',
    level_status: 'confirmed',
    status: 'active',
    metadata: {
      nationality: 'American',
      date_of_birth: '1990-08-15',
      emergency_contact: {
        name: 'Robert Johnson',
        phone: '+1 202 555 0456',
        relationship: 'Husband',
      },
      enrollment_date: '2024-01-10',
    },
  },

  // New students (this week)
  {
    email: 'fatima.almarri@example.com',
    name: 'Fatima Al-Marri',
    phone: '+971 50 123 4567',
    current_level: 'B1',
    initial_level: 'B1',
    level_status: 'provisional',
    visa_type: 'Student Visa',
    visa_expiry: '2026-01-31',
    status: 'active',
    metadata: {
      nationality: 'Emirati',
      date_of_birth: '2002-02-20',
      emergency_contact: {
        name: 'Mohammed Al-Marri',
        phone: '+971 50 999 8888',
        relationship: 'Father',
      },
      enrollment_date: new Date().toISOString().split('T')[0], // Today
    },
  },
];

async function seedStudents() {
  console.log('🌱 Starting student data seeding...\n');

  try {
    // Get first tenant
    const tenants = await db.execute(sql`SELECT id FROM tenants ORDER BY created_at LIMIT 1`);
    if (!tenants || tenants.length === 0) {
      throw new Error('No tenants found. Please run base migrations first.');
    }

    const tenantId = tenants[0].id;
    console.log(`✓ Found tenant: ${tenantId}\n`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const student of sampleStudents) {
      // Check if student already exists
      const existing = await db.execute(
        sql`SELECT id FROM users WHERE email = ${student.email} AND tenant_id = ${tenantId}`
      );

      if (existing && existing.length > 0) {
        console.log(`⊘ Skipped: ${student.name} (${student.email}) - already exists`);
        skippedCount++;
        continue;
      }

      // Insert student
      await db.insert(users).values({
        tenant_id: tenantId,
        email: student.email,
        name: student.name,
        phone: student.phone,
        role: 'student',
        status: student.status,
        current_level: student.current_level,
        initial_level: student.initial_level,
        level_status: student.level_status,
        visa_type: student.visa_type || null,
        visa_expiry: student.visa_expiry || null,
        metadata: student.metadata,
        email_verified: true,
      });

      createdCount++;
      console.log(`✓ Created: ${student.name} (${student.current_level}, ${student.level_status})`);
    }

    console.log(`\n🎉 Seeding complete!`);
    console.log(`   Created: ${createdCount} students`);
    console.log(`   Skipped: ${skippedCount} students (already exist)`);
    console.log(`   Total: ${sampleStudents.length} students in seed data\n`);

    console.log('📊 Sample Data Summary:');
    console.log(`   - Active: ${sampleStudents.filter(s => s.status === 'active').length}`);
    console.log(`   - Suspended: ${sampleStudents.filter(s => s.status === 'suspended').length}`);
    console.log(
      `   - Provisional levels: ${sampleStudents.filter(s => s.level_status === 'provisional').length}`
    );
    console.log(
      `   - Confirmed levels: ${sampleStudents.filter(s => s.level_status === 'confirmed').length}`
    );
    console.log(`   - With visa: ${sampleStudents.filter(s => s.visa_type).length}`);
    console.log(
      `   - CEFR levels: A1(${sampleStudents.filter(s => s.current_level === 'A1').length}), A2(${sampleStudents.filter(s => s.current_level === 'A2').length}), B1(${sampleStudents.filter(s => s.current_level === 'B1').length}), B2(${sampleStudents.filter(s => s.current_level === 'B2').length}), C1(${sampleStudents.filter(s => s.current_level === 'C1').length}), C2(${sampleStudents.filter(s => s.current_level === 'C2').length})`
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding students:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedStudents();
}

export { seedStudents };
