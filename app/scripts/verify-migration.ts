/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Verify Migration Script
 * Checks that FRESH_0011 changes were applied correctly
 */

import { config } from 'dotenv';
import { join } from 'path';
import postgres from 'postgres';

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

async function verifyMigration() {
  try {
    const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

    if (!directUrl) {
      throw new Error('DATABASE_URL or DIRECT_URL environment variable not set');
    }

    console.log('Connecting to database...');
    const sql = postgres(directUrl, { max: 1 });

    console.log('\nVerifying FRESH_0011 migration...\n');

    // Check 1: attendance.minutes_late column
    const [minutesLateCol] = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'attendance' AND column_name = 'minutes_late'
    `;

    if (minutesLateCol) {
      console.log('✅ attendance.minutes_late column exists');
      console.log(
        `   Type: ${minutesLateCol.data_type}, Default: ${minutesLateCol.column_default}`
      );
    } else {
      console.log('❌ attendance.minutes_late column NOT FOUND');
    }

    // Check 2: attendance.minutes_left_early column
    const [minutesEarlyCol] = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'attendance' AND column_name = 'minutes_left_early'
    `;

    if (minutesEarlyCol) {
      console.log('✅ attendance.minutes_left_early column exists');
      console.log(
        `   Type: ${minutesEarlyCol.data_type}, Default: ${minutesEarlyCol.column_default}`
      );
    } else {
      console.log('❌ attendance.minutes_left_early column NOT FOUND');
    }

    // Check 3: classes.programme_id column
    const [programmeIdCol] = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'classes' AND column_name = 'programme_id'
    `;

    if (programmeIdCol) {
      console.log('✅ classes.programme_id column exists');
      console.log(`   Type: ${programmeIdCol.data_type}, Nullable: ${programmeIdCol.is_nullable}`);
    } else {
      console.log('❌ classes.programme_id column NOT FOUND');
    }

    // Check 4: idx_attendance_student_date index
    const [attendanceIndex] = await sql`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE tablename = 'attendance' AND indexname = 'idx_attendance_student_date'
    `;

    if (attendanceIndex) {
      console.log('✅ idx_attendance_student_date index exists');
    } else {
      console.log('❌ idx_attendance_student_date index NOT FOUND');
    }

    // Check 5: idx_classes_programme index
    const [classesIndex] = await sql`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE tablename = 'classes' AND indexname = 'idx_classes_programme'
    `;

    if (classesIndex) {
      console.log('✅ idx_classes_programme index exists');
    } else {
      console.log('❌ idx_classes_programme index NOT FOUND');
    }

    // Check 6: Sample query to ensure indexes work
    const [count] = await sql`
      SELECT COUNT(*) as count FROM attendance
    `;

    console.log(`\n📊 Current attendance records: ${count.count}`);

    console.log('\n✅ Migration verification complete!\n');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed:');
    console.error(error);
    process.exit(1);
  }
}

verifyMigration();
