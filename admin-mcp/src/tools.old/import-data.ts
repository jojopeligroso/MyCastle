/**
 * Import Data Tool
 * Imports data from XLSX files to Supabase tables
 */

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { auditLog } from '../lib/audit.js';
import { parseXLSXBuffer, validateColumnMapping } from '../lib/xlsx-reader.js';
import type { User } from '../types/user.js';

// Table schemas for import validation
const TABLE_SCHEMAS = {
  users: {
    required: ['email', 'name', 'role'],
    optional: ['phone', 'status'],
    description: 'Import users (students, teachers, or admins)',
  },
  classes: {
    required: ['name', 'code'],
    optional: ['description', 'level', 'capacity', 'schedule', 'room'],
    description: 'Import classes',
  },
  enrollments: {
    required: ['student_email', 'class_code'],
    optional: ['status', 'enrollment_date'],
    description: 'Import student enrollments (uses email/code for lookup)',
  },
  sessions: {
    required: ['class_code', 'session_date', 'start_time', 'end_time'],
    optional: ['room', 'topic', 'notes'],
    description: 'Import class sessions (uses class_code for lookup)',
  },
  attendance: {
    required: ['student_email', 'class_code', 'session_date', 'status'],
    optional: ['notes'],
    description: 'Import attendance records (uses email/codes for lookup)',
  },
} as const;

// Input schema
export const ImportDataSchema = z.object({
  file_data: z.string().describe('Base64 encoded XLSX file data'),
  table: z.enum(['users', 'classes', 'enrollments', 'sessions', 'attendance'], {
    errorMap: () => ({ message: 'Invalid table. Must be: users, classes, enrollments, sessions, or attendance' }),
  }),
  dry_run: z.boolean().optional().describe('If true, validate only without inserting'),
  skip_duplicates: z.boolean().optional().describe('If true, skip rows that would cause unique constraint violations'),
});

export type ImportDataInput = z.infer<typeof ImportDataSchema>;

// Output schema
export const ImportDataOutputSchema = z.object({
  success: z.boolean(),
  summary: z.object({
    table: z.string(),
    total_rows: z.number(),
    imported_rows: z.number(),
    skipped_rows: z.number(),
    errors: z.array(z.object({
      row: z.number(),
      error: z.string(),
    })),
    dry_run: z.boolean(),
  }).optional(),
  error: z.string().optional(),
});

export type ImportDataOutput = z.infer<typeof ImportDataOutputSchema>;

export const importData = {
  name: 'import-data',
  description: 'Import data from XLSX file to database table (uses row 1 as column headers)',
  scopes: ['admin.write.import', 'admin.write.user', 'admin.write.class'],
  inputSchema: ImportDataSchema,
  outputSchema: ImportDataOutputSchema,

  execute: async (
    input: ImportDataInput,
    user: User
  ): Promise<ImportDataOutput> => {
    // Validate input
    const validated = ImportDataSchema.parse(input);

    // Create Supabase client with user JWT for RLS
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${user.jwt}`,
          },
        },
      }
    );

    try {
      // Decode base64 file data
      const buffer = Buffer.from(validated.file_data, 'base64');

      // Parse XLSX file
      const parsedData = parseXLSXBuffer(buffer, {
        skipEmptyRows: true,
        trimValues: true,
      });

      console.log(`[import-data] Parsed ${parsedData.totalRows} rows from ${parsedData.sheetName}`);

      // Get table schema
      const tableSchema = TABLE_SCHEMAS[validated.table];
      if (!tableSchema) {
        throw new Error(`Import not supported for table: ${validated.table}`);
      }

      // Validate column mapping
      const columnValidation = validateColumnMapping(
        parsedData.headers,
        tableSchema.required,
        tableSchema.optional
      );

      if (!columnValidation.valid) {
        throw new Error(
          `Missing required columns: ${columnValidation.missingRequired.join(', ')}`
        );
      }

      // Process rows based on table
      const errors: Array<{ row: number; error: string }> = [];
      let importedRows = 0;
      let skippedRows = 0;

      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowIndex = i + 2; // +2 because row 1 is headers, array is 0-indexed
        const row = parsedData.rows[i];

        try {
          // Map row data to database columns
          const mappedRow: Record<string, any> = {};

          Object.keys(row).forEach((xlsxHeader) => {
            const dbColumn = columnValidation.mapping[xlsxHeader];
            if (dbColumn) {
              mappedRow[dbColumn] = row[xlsxHeader];
            }
          });

          // Process based on table type
          if (validated.dry_run) {
            // Dry run - just validate
            await validateRow(supabase, validated.table, mappedRow, user.tenant_id);
            importedRows++;
          } else {
            // Actual import
            await importRow(
              supabase,
              validated.table,
              mappedRow,
              user,
              validated.skip_duplicates || false
            );
            importedRows++;
          }
        } catch (error: any) {
          console.error(`[import-data] Error on row ${rowIndex}:`, error.message);

          if (validated.skip_duplicates && error.message.includes('duplicate')) {
            skippedRows++;
          } else {
            errors.push({
              row: rowIndex,
              error: error.message,
            });

            // Stop on error if not skipping duplicates
            if (!validated.skip_duplicates) {
              break;
            }
          }
        }
      }

      // Audit log
      await auditLog({
        supabase,
        actor_id: user.id,
        action: 'import-data',
        resource_type: validated.table,
        resource_id: `import-${Date.now()}`,
        changes: {
          table: validated.table,
          total_rows: parsedData.totalRows,
          imported_rows: importedRows,
          skipped_rows: skippedRows,
          errors: errors.length,
          dry_run: validated.dry_run || false,
        },
        tenant_id: user.tenant_id,
      });

      return {
        success: errors.length === 0 || validated.skip_duplicates,
        summary: {
          table: validated.table,
          total_rows: parsedData.totalRows,
          imported_rows: importedRows,
          skipped_rows: skippedRows,
          errors,
          dry_run: validated.dry_run || false,
        },
      };
    } catch (error: any) {
      console.error('[import-data] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to import data',
      };
    }
  },
};

/**
 * Validate a row before import (dry run)
 */
async function validateRow(
  supabase: any,
  table: string,
  row: Record<string, any>,
  tenant_id: string
): Promise<void> {
  // Basic validation based on table type
  switch (table) {
    case 'users':
      if (!row.email || !row.name || !row.role) {
        throw new Error('Missing required fields: email, name, or role');
      }
      if (!['student', 'teacher', 'admin'].includes(row.role)) {
        throw new Error(`Invalid role: ${row.role}`);
      }
      break;

    case 'classes':
      if (!row.name || !row.code) {
        throw new Error('Missing required fields: name or code');
      }
      break;

    case 'enrollments':
      if (!row.student_email || !row.class_code) {
        throw new Error('Missing required fields: student_email or class_code');
      }
      break;

    case 'sessions':
      if (!row.class_code || !row.session_date || !row.start_time || !row.end_time) {
        throw new Error('Missing required fields: class_code, session_date, start_time, or end_time');
      }
      break;

    case 'attendance':
      if (!row.student_email || !row.class_code || !row.session_date || !row.status) {
        throw new Error('Missing required fields: student_email, class_code, session_date, or status');
      }
      if (!['present', 'absent', 'late', 'excused'].includes(row.status)) {
        throw new Error(`Invalid attendance status: ${row.status}`);
      }
      break;
  }
}

/**
 * Import a single row to database
 */
async function importRow(
  supabase: any,
  table: string,
  row: Record<string, any>,
  user: User,
  skipDuplicates: boolean
): Promise<void> {
  const tenant_id = user.tenant_id;

  switch (table) {
    case 'users': {
      const { error } = await supabase
        .from('users')
        .insert({
          email: row.email,
          name: row.name,
          role: row.role,
          phone: row.phone || null,
          status: row.status || 'active',
          tenant_id,
          created_by: user.id,
          created_at: new Date().toISOString(),
        });

      if (error) {
        if (skipDuplicates && error.message.includes('duplicate')) {
          return; // Skip duplicate
        }
        throw error;
      }
      break;
    }

    case 'classes': {
      const { error } = await supabase
        .from('classes')
        .insert({
          name: row.name,
          code: row.code,
          description: row.description || null,
          level: row.level || null,
          capacity: row.capacity || null,
          schedule: row.schedule || null,
          room: row.room || null,
          status: 'active',
          tenant_id,
          created_by: user.id,
          created_at: new Date().toISOString(),
        });

      if (error) {
        if (skipDuplicates && error.message.includes('duplicate')) {
          return;
        }
        throw error;
      }
      break;
    }

    case 'enrollments': {
      // Look up student by email
      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('id')
        .eq('email', row.student_email)
        .eq('tenant_id', tenant_id)
        .single();

      if (studentError || !student) {
        throw new Error(`Student not found: ${row.student_email}`);
      }

      // Look up class by code
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('code', row.class_code)
        .eq('tenant_id', tenant_id)
        .single();

      if (classError || !classData) {
        throw new Error(`Class not found: ${row.class_code}`);
      }

      const { error } = await supabase
        .from('enrollments')
        .insert({
          student_id: student.id,
          class_id: classData.id,
          status: row.status || 'active',
          enrollment_date: row.enrollment_date || new Date().toISOString().split('T')[0],
          tenant_id,
          created_by: user.id,
          created_at: new Date().toISOString(),
        });

      if (error) {
        if (skipDuplicates && error.message.includes('duplicate')) {
          return;
        }
        throw error;
      }
      break;
    }

    case 'sessions': {
      // Look up class by code
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, teacher_id')
        .eq('code', row.class_code)
        .eq('tenant_id', tenant_id)
        .single();

      if (classError || !classData) {
        throw new Error(`Class not found: ${row.class_code}`);
      }

      const { error } = await supabase
        .from('sessions')
        .insert({
          class_id: classData.id,
          session_date: row.session_date,
          start_time: row.start_time,
          end_time: row.end_time,
          room: row.room || null,
          topic: row.topic || null,
          notes: row.notes || null,
          teacher_id: classData.teacher_id,
          status: 'scheduled',
          tenant_id,
          created_by: user.id,
          created_at: new Date().toISOString(),
        });

      if (error) {
        if (skipDuplicates && error.message.includes('duplicate')) {
          return;
        }
        throw error;
      }
      break;
    }

    case 'attendance': {
      // Look up student by email
      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('id')
        .eq('email', row.student_email)
        .eq('tenant_id', tenant_id)
        .single();

      if (studentError || !student) {
        throw new Error(`Student not found: ${row.student_email}`);
      }

      // Look up class by code
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('code', row.class_code)
        .eq('tenant_id', tenant_id)
        .single();

      if (classError || !classData) {
        throw new Error(`Class not found: ${row.class_code}`);
      }

      // Look up session by class and date
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('class_id', classData.id)
        .eq('session_date', row.session_date)
        .eq('tenant_id', tenant_id)
        .single();

      if (sessionError || !session) {
        throw new Error(`Session not found for class ${row.class_code} on ${row.session_date}`);
      }

      const { error } = await supabase
        .from('attendance')
        .insert({
          session_id: session.id,
          student_id: student.id,
          status: row.status,
          notes: row.notes || null,
          tenant_id,
          created_by: user.id,
          created_at: new Date().toISOString(),
        });

      if (error) {
        if (skipDuplicates && error.message.includes('duplicate')) {
          return;
        }
        throw error;
      }
      break;
    }
  }
}
