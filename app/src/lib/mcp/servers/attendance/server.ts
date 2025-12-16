#!/usr/bin/env node
/**
 * Attendance & Compliance MCP Server - Standalone Process
 *
 * Provides 8 tools for attendance tracking and compliance
 * Communicates via stdio using JSON-RPC 2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { db } from '@/db';
import { attendanceRecords, auditLogs } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

function getSessionFromContext(extra?: any) {
  return {
    tenantId: extra?._meta?.tenant_id || 'default-tenant',
    userId: extra?._meta?.user_id || 'system',
    role: extra?._meta?.role || 'teacher',
    scopes: extra?._meta?.scopes || ['attendance:*'],
  };
}

async function main() {
  const server = new McpServer(
    {
      name: 'attendance-compliance-mcp',
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

  // Tool: record_attendance
  server.registerTool(
    'record_attendance',
    {
      description: 'Record student attendance for a class session',
      inputSchema: {
        class_id: z.string().uuid().describe('Class ID'),
        student_id: z.string().uuid().describe('Student ID'),
        date: z.string().describe('Attendance date (ISO 8601)'),
        status: z.enum(['present', 'absent', 'late', 'excused']).describe('Attendance status'),
        notes: z.string().optional().describe('Additional notes'),
      },
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { class_id, student_id, date, status, notes } = args;

      const [record] = await db
        .insert(attendanceRecords)
        .values({
          tenant_id: session.tenantId,
          class_id,
          student_id,
          date: new Date(date),
          status,
          notes,
          recorded_by: session.userId,
        })
        .returning();

      return {
        content: [
          {
            type: 'text',
            text: `Attendance recorded: ${status} for student on ${date}`,
          },
        ],
      };
    }
  );

  // Tool: get_attendance_report
  server.registerTool(
    'get_attendance_report',
    {
      description: 'Generate attendance report for a student or class',
      inputSchema: {
        class_id: z.string().uuid().optional().describe('Filter by class'),
        student_id: z.string().uuid().optional().describe('Filter by student'),
        start_date: z.string().describe('Report start date'),
        end_date: z.string().describe('Report end date'),
      },
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { class_id, student_id, start_date, end_date } = args;

      const conditions = [
        eq(attendanceRecords.tenant_id, session.tenantId),
        gte(attendanceRecords.date, new Date(start_date)),
        lte(attendanceRecords.date, new Date(end_date)),
      ];

      if (class_id) conditions.push(eq(attendanceRecords.class_id, class_id));
      if (student_id) conditions.push(eq(attendanceRecords.student_id, student_id));

      const records = await db
        .select()
        .from(attendanceRecords)
        .where(and(...conditions))
        .orderBy(desc(attendanceRecords.date));

      const summary = {
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
        excused: records.filter(r => r.status === 'excused').length,
      };

      return {
        content: [
          {
            type: 'text',
            text: `Attendance Report (${start_date} to ${end_date})\n\nTotal: ${summary.total}\nPresent: ${summary.present}\nAbsent: ${summary.absent}\nLate: ${summary.late}\nExcused: ${summary.excused}\n\nAttendance Rate: ${((summary.present / summary.total) * 100).toFixed(1)}%`,
          },
        ],
      };
    }
  );

  // Resource: attendance://records
  server.registerResource(
    'records',
    'attendance://records',
    {
      description: 'Recent attendance records',
      mimeType: 'application/json',
    },
    async (uri, extra) => {
      const session = getSessionFromContext(extra);

      const records = await db
        .select()
        .from(attendanceRecords)
        .where(eq(attendanceRecords.tenant_id, session.tenantId))
        .orderBy(desc(attendanceRecords.date))
        .limit(100);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ records }, null, 2),
          },
        ],
      };
    }
  );

  // Prompt: attendance_persona
  server.registerPrompt(
    'attendance_persona',
    {
      description: 'Attendance tracking assistant persona',
    },
    async () => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'You are an attendance tracking assistant for an ESL school. Help teachers record attendance, generate reports, and ensure compliance.',
            },
          },
        ],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Attendance MCP] Server started on stdio');
}

main().catch((error) => {
  console.error('[Attendance MCP] Fatal error:', error);
  process.exit(1);
});
