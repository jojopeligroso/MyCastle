#!/usr/bin/env node
/**
 * Teacher MCP Server - Standalone Process
 *
 * Provides 10 tools for teacher operations
 * Communicates via stdio using JSON-RPC 2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { db } from '@/db';
import { lessonPlans, assignments, grades, auditLogs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

function getSessionFromContext(extra?: any) {
  return {
    tenantId: extra?._meta?.tenant_id || 'default-tenant',
    userId: extra?._meta?.user_id || 'system',
    role: extra?._meta?.role || 'teacher',
    scopes: extra?._meta?.scopes || ['teacher:*'],
  };
}

async function main() {
  const server = new McpServer(
    {
      name: 'teacher-mcp',
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

  // Tool: generate_lesson_plan
  server.registerTool(
    'generate_lesson_plan',
    {
      description: 'Generate a CEFR-aligned lesson plan',
      inputSchema: {
        class_id: z.string().uuid().describe('Class ID'),
        topic: z.string().describe('Lesson topic'),
        cefr_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).describe('CEFR level'),
        duration_minutes: z.number().int().positive().describe('Lesson duration'),
        focus_skills: z
          .array(z.enum(['reading', 'writing', 'listening', 'speaking']))
          .describe('Focus language skills'),
      },
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { class_id, topic, cefr_level, duration_minutes, focus_skills } = args;

      // Generate lesson plan using AI (simplified)
      const lessonContent = {
        warmup: `${topic} introduction (10 min)`,
        main_activity: `${topic} practice at ${cefr_level} level (${duration_minutes - 20} min)`,
        cooldown: 'Review and homework assignment (10 min)',
      };

      const [plan] = await db
        .insert(lessonPlans)
        .values({
          tenant_id: session.tenantId,
          class_id,
          teacher_id: session.userId,
          title: `${topic} - ${cefr_level}`,
          cefr_level,
          duration_minutes,
          objectives: [`Master ${topic} at ${cefr_level} level`],
          content: lessonContent,
          materials: ['Textbook', 'Whiteboard', 'Audio materials'],
        })
        .returning();

      return {
        content: [
          {
            type: 'text',
            text: `Lesson Plan Generated\n\nTopic: ${topic}\nLevel: ${cefr_level}\nDuration: ${duration_minutes} min\nFocus: ${focus_skills.join(', ')}\n\nPlan ID: ${plan.id}`,
          },
        ],
      };
    }
  );

  // Tool: create_assignment
  server.registerTool(
    'create_assignment',
    {
      description: 'Create a new assignment for students',
      inputSchema: {
        class_id: z.string().uuid().describe('Class ID'),
        title: z.string().describe('Assignment title'),
        description: z.string().describe('Assignment description'),
        due_date: z.string().describe('Due date (ISO 8601)'),
        max_score: z.number().int().positive().default(100).describe('Maximum score'),
        type: z.enum(['homework', 'quiz', 'essay', 'presentation']).describe('Assignment type'),
      },
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { class_id, title, description, due_date, max_score, type } = args;

      const [assignment] = await db
        .insert(assignments)
        .values({
          tenant_id: session.tenantId,
          class_id,
          teacher_id: session.userId,
          title,
          description,
          due_date: new Date(due_date),
          max_score,
          type,
          status: 'active',
        })
        .returning();

      return {
        content: [
          {
            type: 'text',
            text: `Assignment created: ${title}\nType: ${type}\nDue: ${due_date}\nMax Score: ${max_score}`,
          },
        ],
      };
    }
  );

  // Tool: grade_assignment
  server.registerTool(
    'grade_assignment',
    {
      description: 'Grade a student assignment',
      inputSchema: {
        assignment_id: z.string().uuid().describe('Assignment ID'),
        student_id: z.string().uuid().describe('Student ID'),
        score: z.number().min(0).describe('Score achieved'),
        feedback: z.string().optional().describe('Feedback for student'),
      },
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { assignment_id, student_id, score, feedback } = args;

      const [grade] = await db
        .insert(grades)
        .values({
          tenant_id: session.tenantId,
          assignment_id,
          student_id,
          score,
          feedback,
          graded_by: session.userId,
          graded_at: new Date(),
        })
        .returning();

      return {
        content: [
          {
            type: 'text',
            text: `Assignment graded\nStudent: ${student_id}\nScore: ${score}\n${feedback ? `Feedback: ${feedback}` : ''}`,
          },
        ],
      };
    }
  );

  // Resource: teacher://my_classes
  server.registerResource(
    'my_classes',
    'teacher://my_classes',
    {
      description: "Teacher's assigned classes",
      mimeType: 'application/json',
    },
    async (uri, extra) => {
      const session = getSessionFromContext(extra);

      // Fetch teacher's classes (simplified)
      const data = {
        teacher_id: session.userId,
        classes: [],
        message: 'Classes would be fetched from database',
      };

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  // Prompt: teacher_persona
  server.registerPrompt(
    'teacher_persona',
    {
      description: 'Teacher assistant persona',
    },
    async () => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'You are a teaching assistant for ESL teachers. Help with lesson planning, assignments, grading, and classroom management.',
            },
          },
        ],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Teacher MCP] Server started on stdio');
}

main().catch((error) => {
  console.error('[Teacher MCP] Fatal error:', error);
  process.exit(1);
});
