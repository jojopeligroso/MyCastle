/**
 * Seed Timetable Data
 * Creates sample class sessions for testing timetable functionality
 *
 * Usage:
 *   tsx scripts/seed-timetable.ts
 *
 * Environment Variables Required:
 *   - DATABASE_URL
 */

import { db } from '../src/db';
import { classes, classSessions } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function seedTimetable() {
  console.log('🌱 Seeding timetable data...\n');

  try {
    // Fetch all active classes
    const activeClasses = await db
      .select()
      .from(classes)
      .where(eq(classes.status, 'active'));

    if (activeClasses.length === 0) {
      console.warn('⚠️  No active classes found. Please create classes first.');
      return;
    }

    console.log(`Found ${activeClasses.length} active classes\n`);

    // Get current Monday (start of week)
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);

    // Create sessions for the next 4 weeks
    const weekCount = 4;
    let totalSessionsCreated = 0;

    for (let week = 0; week < weekCount; week++) {
      console.log(`Week ${week + 1}:`);

      for (const classItem of activeClasses) {
        // Create 2-3 sessions per week per class
        const sessionsPerWeek = 2 + Math.floor(Math.random() * 2); // 2 or 3 sessions

        for (let session = 0; session < sessionsPerWeek; session++) {
          // Random day (Mon-Fri: 0-4)
          const dayOffset = Math.floor(Math.random() * 5);
          const sessionDate = new Date(monday);
          sessionDate.setDate(monday.getDate() + week * 7 + dayOffset);

          // Random time slots (09:00, 10:00, 11:00, 13:00, 14:00, 15:00)
          const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
          const startTime = timeSlots[Math.floor(Math.random() * timeSlots.length)];

          // End time is 1 hour after start
          const [hours, minutes] = startTime.split(':').map(Number);
          const endTime = `${String((hours + 1) % 24).padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

          // Check if session already exists
          const existing = await db
            .select()
            .from(classSessions)
            .where(
              eq(classSessions.class_id, classItem.id)
              // Add date and time checks if needed
            )
            .limit(1);

          // Create session
          await db.insert(classSessions).values({
            tenant_id: classItem.tenant_id,
            class_id: classItem.id,
            session_date: sessionDate.toISOString().split('T')[0],
            start_time: startTime,
            end_time: endTime,
            topic: `Session ${session + 1}`,
            status: 'scheduled',
            notes: 'Auto-generated session for timetable',
          });

          totalSessionsCreated++;
          console.log(
            `  ✓ Created session for ${classItem.name} on ${sessionDate.toISOString().split('T')[0]} at ${startTime}`
          );
        }
      }

      console.log('');
    }

    console.log(`\n✅ Successfully created ${totalSessionsCreated} timetable sessions\n`);
  } catch (error) {
    console.error('❌ Error seeding timetable data:', error);
    throw error;
  }
}

// Run seeding
seedTimetable()
  .then(() => {
    console.log('✅ Timetable seeding completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Timetable seeding failed:', error);
    process.exit(1);
  });
