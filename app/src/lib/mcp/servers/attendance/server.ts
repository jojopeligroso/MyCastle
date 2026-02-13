#!/usr/bin/env node
/**
 * Attendance & Compliance MCP Server - Standalone Process
 *
 * Provides tools for attendance tracking and compliance
 * Communicates via stdio using JSON-RPC 2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { db } from '@/db';
import { attendance } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

interface MCPMeta {
  tenant_id?: string;
  user_id?: string;
  role?: string;
  scopes?: string[];
}

function getSessionFromContext(extra?: unknown) {
  const meta = (extra as { _meta?: MCPMeta } | undefined)?._meta;
  return {
    tenantId: meta?.tenant_id || 'default-tenant',
    userId: meta?.user_id || 'system',
    role: meta?.role || 'teacher',
    scopes: meta?.scopes || ['attendance:*'],
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
  server.tool(
    'record_attendance',
    {
      class_session_id: z.string().uuid().describe('Class Session ID'),
      student_id: z.string().uuid().describe('Student ID'),
      status: z.enum(['present', 'absent', 'late', 'excused']).describe('Attendance status'),
      notes: z.string().optional().describe('Additional notes'),
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { class_session_id, student_id, status, notes } = args;

      await db
        .insert(attendance)
        .values({
          tenantId: session.tenantId,
          classSessionId: class_session_id,
          studentId: student_id,
          status,
          notes,
          recordedBy: session.userId,
          recordedAt: new Date(),
        } as typeof attendance.$inferInsert)
        .returning();

      return {
        content: [
          {
            type: 'text',
            text: `Attendance recorded: ${status} for student in session ${class_session_id}`,
          },
        ],
      };
    }
  );

  // Tool: get_attendance Report
  server.tool(
    'get_attendance_report',
    {
      student_id: z.string().uuid().optional().describe('Filter by student'),
      start_date: z.string().describe('Report start date'),
      end_date: z.string().describe('Report end date'),
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { student_id, start_date, end_date } = args;

      const conditions = [
        eq(attendance.tenantId, session.tenantId),
        gte(attendance.recordedAt, new Date(start_date)),
        lte(attendance.recordedAt, new Date(end_date)),
      ];

      if (student_id) conditions.push(eq(attendance.studentId, student_id));

      const records = await db
        .select()
        .from(attendance)
        .where(and(...conditions))
        .orderBy(desc(attendance.recordedAt));

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
            text: `Attendance Report (${start_date} to ${end_date})\n\nTotal: ${summary.total}\nPresent: ${summary.present}\nAbsent: ${summary.absent}\nLate: ${summary.late}\nExcused: ${summary.excused}\n\nAttendance Rate: ${summary.total > 0 ? ((summary.present / summary.total) * 100).toFixed(1) : '0'}%`,
          },
        ],
      };
    }
  );

  // Resource: attendance://records
  server.resource(
    'records',
    'attendance://records',
    {
      mimeType: 'application/json',
    },
    async (uri, extra) => {
      const session = getSessionFromContext(extra);

      const records = await db
        .select()
        .from(attendance)
        .where(eq(attendance.tenantId, session.tenantId))
        .orderBy(desc(attendance.recordedAt))
        .limit(100);

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify({ records }, null, 2),
          },
        ],
      };
    }
  );

  // Prompt: attendance_persona
  server.prompt('attendance_persona', 'Attendance tracking assistant persona', async () => {
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
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Attendance MCP] Server started on stdio');
}

main().catch(error => {
  console.error('[Attendance MCP] Fatal error:', error);
  process.exit(1);
});
