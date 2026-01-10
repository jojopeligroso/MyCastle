import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/utils';

// Define schema metadata for common tables
const SCHEMA_TABLES = [
  {
    name: 'users',
    description: 'All users (students, teachers, admins)',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'email', type: 'varchar', nullable: false },
      { name: 'name', type: 'varchar', nullable: false },
      { name: 'role', type: 'varchar', nullable: false },
      { name: 'status', type: 'varchar', nullable: true },
      { name: 'current_level', type: 'varchar', nullable: true },
      { name: 'target_level', type: 'varchar', nullable: true },
      { name: 'date_of_birth', type: 'date', nullable: true },
      { name: 'phone', type: 'varchar', nullable: true },
      { name: 'address', type: 'text', nullable: true },
      { name: 'city', type: 'varchar', nullable: true },
      { name: 'country', type: 'varchar', nullable: true },
      { name: 'postal_code', type: 'varchar', nullable: true },
      { name: 'visa_type', type: 'varchar', nullable: true },
      { name: 'visa_expiry', type: 'date', nullable: true },
      { name: 'visa_conditions', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamp', nullable: false },
      { name: 'updated_at', type: 'timestamp', nullable: false },
      { name: 'deleted_at', type: 'timestamp', nullable: true },
    ],
  },
  {
    name: 'classes',
    description: 'Class instances with schedule',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'name', type: 'varchar', nullable: false },
      { name: 'code', type: 'varchar', nullable: false },
      { name: 'level', type: 'varchar', nullable: true },
      { name: 'start_date', type: 'date', nullable: true },
      { name: 'end_date', type: 'date', nullable: true },
      { name: 'status', type: 'varchar', nullable: true },
      { name: 'teacher_id', type: 'uuid', nullable: true },
      { name: 'capacity', type: 'integer', nullable: true },
      { name: 'created_at', type: 'timestamp', nullable: false },
    ],
  },
  {
    name: 'enrollments',
    description: 'Student enrollments in classes',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'student_id', type: 'uuid', nullable: false },
      { name: 'class_id', type: 'uuid', nullable: false },
      { name: 'status', type: 'varchar', nullable: false },
      { name: 'start_date', type: 'date', nullable: true },
      { name: 'end_date', type: 'date', nullable: true },
      { name: 'expected_end_date', type: 'date', nullable: true },
      { name: 'booked_weeks', type: 'integer', nullable: true },
      { name: 'created_at', type: 'timestamp', nullable: false },
    ],
  },
  {
    name: 'courses',
    description: 'Course definitions',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'programme_id', type: 'uuid', nullable: false },
      { name: 'name', type: 'varchar', nullable: false },
      { name: 'code', type: 'varchar', nullable: false },
      { name: 'level', type: 'varchar', nullable: true },
      { name: 'description', type: 'text', nullable: true },
      { name: 'duration_weeks', type: 'integer', nullable: true },
      { name: 'objectives', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamp', nullable: false },
    ],
  },
  {
    name: 'programmes',
    description: 'Academic programmes',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'name', type: 'varchar', nullable: false },
      { name: 'code', type: 'varchar', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'duration_weeks', type: 'integer', nullable: true },
      { name: 'levels', type: 'jsonb', nullable: true },
      { name: 'created_at', type: 'timestamp', nullable: false },
    ],
  },
  {
    name: 'enrollment_amendments',
    description: 'Changes to enrollments (extensions, transfers, etc.)',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'enrollment_id', type: 'uuid', nullable: false },
      { name: 'amendment_type', type: 'varchar', nullable: false },
      { name: 'amendment_date', type: 'date', nullable: false },
      { name: 'previous_end_date', type: 'date', nullable: true },
      { name: 'new_end_date', type: 'date', nullable: true },
      { name: 'status', type: 'varchar', nullable: false },
      { name: 'reason', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamp', nullable: false },
    ],
  },
];

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    return NextResponse.json({
      tables: SCHEMA_TABLES,
    });

  } catch (error) {
    console.error('Error fetching schema:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schema' },
      { status: 500 }
    );
  }
}
