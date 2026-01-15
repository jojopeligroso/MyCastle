#!/usr/bin/env node
/**
 * Academic Operations MCP Server - Standalone Process
 *
 * Provides tools for academic management
 * Communicates via stdio using JSON-RPC 2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { db } from '@/db';
import { classes, enrollments } from '@/db/schema';
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

  // Tool: create_class
  server.tool(
    'create_class',
    {
      name: z.string().min(1).describe('Class Name'),
      code: z.string().min(1).max(50).describe('Class Code (e.g. ENG-101)'),
      teacher_id: z.string().uuid().describe('Teacher user ID'),
      start_date: z.string().describe('Class start date (ISO 8601)'),
      description: z.string().optional().describe('Class description'),
      level: z.string().optional().describe('Difficulty level'),
      subject: z.string().optional().describe('Subject matter'),
      end_date: z.string().optional().describe('Class end date (ISO 8601)'),
      schedule: z.string().optional().describe('Weekly schedule description'),
      max_students: z.number().int().positive().default(20).describe('Capacity'),
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const {
        name,
        code,
        teacher_id,
        start_date,
        end_date,
        description,
        level,
        subject,
        schedule,
        max_students,
      } = args;

      const insertData: any = {
        tenant_id: session.tenantId,
        name,
        code,
        teacher_id,
        description,
        level,
        subject,
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : undefined,
        schedule_description: schedule,
        capacity: max_students,
        status: 'active',
      };

      const [newClass] = await db.insert(classes).values(insertData).returning();

      return {
        content: [
          {
            type: 'text',
            text: `Class created successfully.\nID: ${newClass.id}\nName: ${newClass.name}\nCode: ${newClass.code}`,
          },
        ],
      };
    }
  );

  // Tool: enroll_student
  server.tool(
    'enroll_student',
    {
      student_id: z.string().uuid().describe('Student user ID'),
      class_id: z.string().uuid().describe('Class ID'),
      enrollment_date: z.string().optional().describe('Enrollment date (defaults to now)'),
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { student_id, class_id, enrollment_date } = args;

      const insertData: any = {
        tenant_id: session.tenantId,
        student_id,
        class_id,
        enrollment_date: enrollment_date ? new Date(enrollment_date) : new Date(),
        status: 'active',
      };

      const [enrollment] = await db.insert(enrollments).values(insertData).returning();

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

  // Prompt: academic_persona
  server.prompt('academic_persona', 'Academic operations assistant persona', async () => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'You are an academic operations assistant for an ESL school. Help with classes and student enrollments.',
          },
        },
      ],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Academic MCP] Server started on stdio');
}

main().catch(error => {
  console.error('[Academic MCP] Fatal error:', error);
  process.exit(1);
});
