#!/usr/bin/env node
/**
 * Academic Operations MCP Server - Standalone Process
 *
 * Provides 10 tools for academic management
 * Communicates via stdio using JSON-RPC 2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { db } from '@/db';
import { programmes, courses, classes, enrollments, auditLogs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

function getSessionFromContext(extra?: any) {
  return {
    tenantId: extra?._meta?.tenant_id || 'default-tenant',
    userId: extra?._meta?.user_id || 'system',
    role: extra?._meta?.role || 'admin',
    scopes: extra?._meta?.scopes || ['academic:*'],
  };
}

async function main() {
  const server = new McpServer(
    {
      name: 'academic-operations-mcp',
      version: '3.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Tool: create_programme
  server.registerTool(
    'create_programme',
    {
      description: 'Create a new academic programme',
      inputSchema: {
        name: z.string().min(1).describe('Programme name'),
        code: z.string().min(2).max(10).describe('Programme code (e.g., GE15)'),
        duration_weeks: z.number().int().positive().describe('Duration in weeks'),
        cefr_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).describe('Target CEFR level'),
        description: z.string().optional().describe('Programme description'),
      },
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { name, code, duration_weeks, cefr_level, description } = args;

      const [programme] = await db
        .insert(programmes)
        .values({
          tenant_id: session.tenantId,
          name,
          code,
          duration_weeks,
          cefr_level,
          description,
          status: 'active',
        })
        .returning();

      return {
        content: [
          {
            type: 'text',
            text: `Programme created: ${name} (${code})\nDuration: ${duration_weeks} weeks\nCEFR Level: ${cefr_level}`,
          },
        ],
      };
    }
  );

  // Tool: create_class
  server.registerTool(
    'create_class',
    {
      description: 'Create a new class session',
      inputSchema: {
        course_id: z.string().uuid().describe('Course ID'),
        teacher_id: z.string().uuid().describe('Teacher user ID'),
        start_date: z.string().describe('Class start date (ISO 8601)'),
        end_date: z.string().describe('Class end date (ISO 8601)'),
        schedule: z.string().describe('Weekly schedule (e.g., "Mon-Fri 09:00-12:00")'),
        max_students: z.number().int().positive().default(15).describe('Maximum students'),
      },
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { course_id, teacher_id, start_date, end_date, schedule, max_students } = args;

      const [newClass] = await db
        .insert(classes)
        .values({
          tenant_id: session.tenantId,
          course_id,
          teacher_id,
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          schedule,
          max_students,
          status: 'scheduled',
        })
        .returning();

      return {
        content: [
          {
            type: 'text',
            text: `Class created successfully.\nID: ${newClass.id}\nSchedule: ${schedule}\nMax Students: ${max_students}`,
          },
        ],
      };
    }
  );

  // Tool: enroll_student
  server.registerTool(
    'enroll_student',
    {
      description: 'Enroll a student in a class',
      inputSchema: {
        student_id: z.string().uuid().describe('Student user ID'),
        class_id: z.string().uuid().describe('Class ID'),
        enrollment_date: z.string().optional().describe('Enrollment date (defaults to now)'),
      },
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { student_id, class_id, enrollment_date } = args;

      const [enrollment] = await db
        .insert(enrollments)
        .values({
          tenant_id: session.tenantId,
          student_id,
          class_id,
          enrollment_date: enrollment_date ? new Date(enrollment_date) : new Date(),
          status: 'active',
        })
        .returning();

      return {
        content: [
          {
            type: 'text',
            text: `Student enrolled successfully in class ${class_id}`,
          },
        ],
      };
    }
  );

  // Resource: academic://programmes
  server.registerResource(
    'programmes',
    'academic://programmes',
    {
      description: 'All academic programmes',
      mimeType: 'application/json',
    },
    async (uri, extra) => {
      const session = getSessionFromContext(extra);

      const allProgrammes = await db
        .select()
        .from(programmes)
        .where(eq(programmes.tenant_id, session.tenantId))
        .orderBy(programmes.name);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ programmes: allProgrammes }, null, 2),
          },
        ],
      };
    }
  );

  // Prompt: academic_persona
  server.registerPrompt(
    'academic_persona',
    {
      description: 'Academic operations assistant persona',
    },
    async () => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'You are an academic operations assistant for an ESL school. Help with programmes, courses, classes, and student enrollments.',
            },
          },
        ],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Academic MCP] Server started on stdio');
}

main().catch((error) => {
  console.error('[Academic MCP] Fatal error:', error);
  process.exit(1);
});
