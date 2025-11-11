/**
 * Teacher MCP Schemas
 *
 * Zod schemas for Teacher MCP tools and resources.
 * Ref: DESIGN.md §1 (Teacher MCP), REQ.md §5.1-5.6
 */

import { z } from 'zod';

// ============================================================================
// Timetable Schemas
// ============================================================================

export const TimetableEntrySchema = z.object({
  session_id: z.string().uuid(),
  class_id: z.string().uuid(),
  class_name: z.string(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  room_number: z.string().optional(),
  student_count: z.number().int().nonnegative(),
  cefr_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
});

export type TimetableEntry = z.infer<typeof TimetableEntrySchema>;

export const TimetableResponseSchema = z.object({
  teacher_id: z.string().uuid(),
  week_start: z.string().date(),
  week_end: z.string().date(),
  entries: z.array(TimetableEntrySchema),
  total_hours: z.number(),
});

export type TimetableResponse = z.infer<typeof TimetableResponseSchema>;

// ============================================================================
// Attendance / Register Schemas
// ============================================================================

export const AttendanceStatusSchema = z.enum(['present', 'absent', 'late', 'excused']);
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;

export const AttendanceRecordSchema = z.object({
  student_id: z.string().uuid(),
  student_name: z.string(),
  status: AttendanceStatusSchema,
  notes: z.string().max(500).optional(),
  marked_at: z.string().datetime().optional(),
});

export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;

export const RegisterSchema = z.object({
  session_id: z.string().uuid(),
  class_id: z.string().uuid(),
  class_name: z.string(),
  date: z.string().date(),
  students: z.array(AttendanceRecordSchema),
  is_finalized: z.boolean(),
  hash_prev: z.string().optional(), // Hash chain for tamper evidence
});

export type Register = z.infer<typeof RegisterSchema>;

export const MarkAttendanceInputSchema = z.object({
  session_id: z.string().uuid(),
  attendance: z.array(
    z.object({
      student_id: z.string().uuid(),
      status: AttendanceStatusSchema,
      notes: z.string().max(500).optional(),
    }),
  ),
});

export type MarkAttendanceInput = z.infer<typeof MarkAttendanceInputSchema>;

// ============================================================================
// Progress Note Schemas
// ============================================================================

export const ProgressNoteSchema = z.object({
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
  note: z.string().min(1).max(2000),
  skills_assessed: z.array(z.enum(['speaking', 'listening', 'reading', 'writing'])).optional(),
  cefr_level_estimate: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  next_steps: z.string().max(500).optional(),
});

export type ProgressNote = z.infer<typeof ProgressNoteSchema>;

export const RecordProgressNoteInputSchema = ProgressNoteSchema;

// ============================================================================
// Homework Schemas
// ============================================================================

export const HomeworkSchema = z.object({
  class_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  due_date: z.string().date(),
  materials_url: z.string().url().optional(),
  estimated_minutes: z.number().int().min(5).max(480).optional(),
});

export type Homework = z.infer<typeof HomeworkSchema>;

export const AssignHomeworkInputSchema = HomeworkSchema;

// ============================================================================
// Grading Schemas
// ============================================================================

export const GradeSubmissionInputSchema = z.object({
  submission_id: z.string().uuid(),
  score: z.number().min(0).max(100),
  feedback: z.string().min(1).max(2000),
  skills_breakdown: z
    .object({
      grammar: z.number().min(0).max(100).optional(),
      vocabulary: z.number().min(0).max(100).optional(),
      fluency: z.number().min(0).max(100).optional(),
      accuracy: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

export type GradeSubmissionInput = z.infer<typeof GradeSubmissionInputSchema>;

// ============================================================================
// Material Schemas
// ============================================================================

export const AttachMaterialsInputSchema = z.object({
  lesson_plan_id: z.string().uuid(),
  materials: z.array(
    z.object({
      name: z.string().min(1).max(255),
      type: z.enum(['pdf', 'doc', 'ppt', 'image', 'video', 'link']),
      url: z.string().url(),
      description: z.string().max(500).optional(),
    }),
  ),
});

export type AttachMaterialsInput = z.infer<typeof AttachMaterialsInputSchema>;

// ============================================================================
// CEFR Mapping Schemas
// ============================================================================

export const MapCefrObjectivesInputSchema = z.object({
  lesson_plan_id: z.string().uuid(),
  objectives: z.array(
    z.object({
      objective_text: z.string().min(1),
      cefr_descriptor_id: z.string().uuid(),
      skill: z.enum(['speaking', 'listening', 'reading', 'writing', 'interaction']),
    }),
  ),
});

export type MapCefrObjectivesInput = z.infer<typeof MapCefrObjectivesInputSchema>;

// ============================================================================
// Export Schemas
// ============================================================================

export const ExportClassDataInputSchema = z.object({
  class_id: z.string().uuid(),
  format: z.enum(['csv', 'xlsx', 'json']),
  include_attendance: z.boolean().default(true),
  include_grades: z.boolean().default(true),
  include_progress_notes: z.boolean().default(false),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
});

export type ExportClassDataInput = z.infer<typeof ExportClassDataInputSchema>;

// ============================================================================
// Support Ticket Schemas
// ============================================================================

export const RaiseSupportTicketInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(2000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(['technical', 'administrative', 'curriculum', 'facilities', 'other']),
  class_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
});

export type RaiseSupportTicketInput = z.infer<typeof RaiseSupportTicketInputSchema>;
