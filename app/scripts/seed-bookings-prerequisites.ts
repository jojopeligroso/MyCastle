/**
 * Seed prerequisite data for bookings import testing
 * Creates courses and accommodation types needed by test bookings
 */

import { db } from '../src/db';
import { courses, accommodationTypes, tenants } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function seedBookingsPrerequisites() {
  console.log('🌱 Seeding bookings prerequisites...\n');

  try {
    // Get tenant ID (assuming first tenant for testing)
    const [tenant] = await db.select().from(tenants).limit(1);

    if (!tenant) {
      console.error('❌ No tenant found. Please run seed-fresh-data.ts first.');
      process.exit(1);
    }

    const tenantId = tenant.id;
    console.log(`Using tenant: ${tenant.name} (${tenantId})\n`);

    // Create courses needed by bookings test data
    const coursesToCreate = [
      {
        tenantId,
        name: 'General English B1',
        code: 'GE-B1',
        level: 'B1',
        description: 'General English course for intermediate level',
        weeklyHours: 20,
        status: 'active' as const,
      },
      {
        tenantId,
        name: 'IELTS Preparation',
        code: 'IELTS-PREP',
        level: 'B2',
        description: 'IELTS exam preparation course',
        weeklyHours: 25,
        status: 'active' as const,
      },
      {
        tenantId,
        name: 'General English A2',
        code: 'GE-A2',
        level: 'A2',
        description: 'General English course for pre-intermediate level',
        weeklyHours: 20,
        status: 'active' as const,
      },
    ];

    console.log('📚 Creating courses...');
    for (const course of coursesToCreate) {
      // Check if course already exists
      const existing = await db
        .select()
        .from(courses)
        .where(eq(courses.name, course.name))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  ⏭️  Course "${course.name}" already exists`);
      } else {
        await db.insert(courses).values(course);
        console.log(`  ✅ Created course: ${course.name}`);
      }
    }

    // Create accommodation types
    const accommodationTypesToCreate = [
      {
        tenantId,
        name: 'Host Family',
        description: 'Stay with a local Irish family',
        weeklyRate: '200',
        status: 'active' as const,
      },
      {
        tenantId,
        name: 'Residence',
        description: 'Student residence accommodation',
        weeklyRate: '250',
        status: 'active' as const,
      },
      {
        tenantId,
        name: 'Student House',
        description: 'Shared student house accommodation',
        weeklyRate: '275',
        status: 'active' as const,
      },
    ];

    console.log('\n🏠 Creating accommodation types...');
    for (const accom of accommodationTypesToCreate) {
      // Check if accommodation type already exists
      const existing = await db
        .select()
        .from(accommodationTypes)
        .where(eq(accommodationTypes.name, accom.name))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  ⏭️  Accommodation "${accom.name}" already exists`);
      } else {
        await db.insert(accommodationTypes).values(accom);
        console.log(`  ✅ Created accommodation type: ${accom.name}`);
      }
    }

    console.log('\n✅ All prerequisites seeded successfully!');
    console.log('\nYou can now test bookings import with:');
    console.log('  - Courses: General English B1, IELTS Preparation, General English A2');
    console.log('  - Accommodations: Host Family, Residence, Student House');
  } catch (error) {
    console.error('❌ Error seeding prerequisites:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedBookingsPrerequisites();
