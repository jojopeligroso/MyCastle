/**
 * Create Session Tool
 * Creates a new class session/lesson
 */

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { auditLog } from '../lib/audit.js';
import type { User } from '../types/user.js';

// Input schema
export const CreateSessionSchema = z.object({
  class_id: z.string().uuid('Invalid class ID format'),
  session_date: z.string().describe('Session date (ISO8601)'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  room: z.string().optional(),
  topic: z.string().optional().describe('Lesson topic/title'),
  notes: z.string().optional().describe('Session notes'),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

// Output schema
export const CreateSessionOutputSchema = z.object({
  success: z.boolean(),
  session: z.object({
    id: z.string(),
    class_id: z.string(),
    class_name: z.string(),
    session_date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    room: z.string().nullable().optional(),
    topic: z.string().nullable().optional(),
    created_at: z.string(),
  }).optional(),
  error: z.string().optional(),
});

export type CreateSessionOutput = z.infer<typeof CreateSessionOutputSchema>;

export const createSession = {
  name: 'create-session',
  description: 'Create a new class session/lesson',
  scopes: ['admin.write.session'],
  inputSchema: CreateSessionSchema,
  outputSchema: CreateSessionOutputSchema,

  execute: async (
    input: CreateSessionInput,
    user: User
  ): Promise<CreateSessionOutput> => {
    // Validate input
    const validated = CreateSessionSchema.parse(input);

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
      // Verify class exists
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name, teacher_id')
        .eq('id', validated.class_id)
        .eq('tenant_id', user.tenant_id)
        .single();

      if (classError || !classData) {
        throw new Error(`Class not found: ${validated.class_id}`);
      }

      // Validate time range
      if (validated.start_time >= validated.end_time) {
        throw new Error('End time must be after start time');
      }

      // Check for overlapping sessions
      const sessionDateTime = new Date(validated.session_date);
      const startDateTime = new Date(`${validated.session_date}T${validated.start_time}`);
      const endDateTime = new Date(`${validated.session_date}T${validated.end_time}`);

      // Create session
      const { data: session, error: insertError } = await supabase
        .from('sessions')
        .insert({
          class_id: validated.class_id,
          session_date: validated.session_date,
          start_time: validated.start_time,
          end_time: validated.end_time,
          room: validated.room,
          topic: validated.topic,
          notes: validated.notes,
          teacher_id: classData.teacher_id,
          status: 'scheduled',
          tenant_id: user.tenant_id,
          created_by: user.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Audit log
      await auditLog({
        supabase,
        actor_id: user.id,
        action: 'create-session',
        resource_type: 'session',
        resource_id: session.id,
        changes: {
          after: {
            class_id: validated.class_id,
            class_name: classData.name,
            session_date: validated.session_date,
            start_time: validated.start_time,
            end_time: validated.end_time,
            topic: validated.topic,
          },
        },
        tenant_id: user.tenant_id,
      });

      return {
        success: true,
        session: {
          id: session.id,
          class_id: session.class_id,
          class_name: classData.name,
          session_date: session.session_date,
          start_time: session.start_time,
          end_time: session.end_time,
          room: session.room,
          topic: session.topic,
          created_at: session.created_at,
        },
      };
    } catch (error: any) {
      console.error('[create-session] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create session',
      };
    }
  },
};
