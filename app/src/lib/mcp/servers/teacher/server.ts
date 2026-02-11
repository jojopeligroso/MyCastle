#!/usr/bin/env node
/**
 * Teacher MCP Server - Standalone Process
 *
 * Provides tools for teacher operations
 * Communicates via stdio using JSON-RPC 2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { db } from '@/db';
import { lessonPlans, assignments, grades } from '@/db/schema';
// Imports for future use - drizzle-orm operators reserved for query filtering

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
    scopes: meta?.scopes || ['teacher:*'],
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
  server.tool(
    'generate_lesson_plan',
    {
      class_id: z.string().uuid().describe('Class ID'),
      topic: z.string().describe('Lesson topic'),
      cefr_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).describe('CEFR level'),
      duration_minutes: z.string().describe('Lesson duration in minutes (e.g. "60")'),
      focus_skills: z
        .array(z.enum(['reading', 'writing', 'listening', 'speaking']))
        .describe('Focus language skills'),
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { class_id, topic, cefr_level, duration_minutes, focus_skills } = args;

      // Generate lesson plan using AI (simplified)
      const lessonContent = {
        objectives: [`Master ${topic} at ${cefr_level} level`],
        activities: [
          { name: 'Warmup', duration: '10 min', description: `${topic} introduction` },
          { name: 'Main Activity', duration: '40 min', description: `${topic} practice` },
        ],
        warmup: `${topic} introduction (10 min)`,
        main_activity: `${topic} practice at ${cefr_level} level`,
        cooldown: 'Review and homework assignment (10 min)',
        materials: ['Textbook', 'Whiteboard', 'Audio materials'],
        assessment: 'Observation',
        focus_skills,
      };

      const insertData: unknown = {
        tenantId: session.tenantId,
        classId: class_id,
        teacherId: session.userId,
        title: `${topic} - ${cefr_level}`,
        cefrLevel: cefr_level,
        durationMinutes: duration_minutes,
        jsonPlan: lessonContent,
        isAiGenerated: true,
        status: 'draft',
      };

      const [plan] = await db.insert(lessonPlans).values(insertData).returning();

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
  // @ts-expect-error - MCP SDK type inference issue with zod schemas
  server.tool(
    'create_assignment',
    {
      class_id: z.string().uuid().describe('Class ID'),
      title: z.string().describe('Assignment title'),
      description: z.string().describe('Assignment description'),
      due_date: z.string().describe('Due date (ISO 8601)'),
      max_score: z.number().int().positive().default(100).describe('Maximum score'),
      type: z.enum(['homework', 'quiz', 'exam', 'project']).describe('Assignment type'),
    },
    async (args: unknown, extra: unknown) => {
      const session = getSessionFromContext(extra);
      const { class_id, title, description, due_date, max_score, type } = args as {
        class_id: string;
        title: string;
        description: string;
        due_date: string;
        max_score: number;
        type: string;
      };

      const insertData: unknown = {
        tenantId: session.tenantId,
        classId: class_id,
        title,
        description,
        dueDate: new Date(due_date),
        assignedDate: new Date(),
        maxScore: max_score,
        type,
        status: 'active',
      };

      await db.insert(assignments).values(insertData).returning();

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

  // Tool: grade_submission
  server.tool(
    'grade_submission',
    {
      submission_id: z.string().uuid().describe('Submission ID'),
      score: z.number().min(0).describe('Score achieved'),
      feedback: z.string().optional().describe('Feedback for student'),
      grade: z.string().optional().describe('Letter grade (e.g. A, B+)'),
    },
    async (args, extra) => {
      const session = getSessionFromContext(extra);
      const { submission_id, score, feedback, grade } = args;

      const insertData: unknown = {
        tenantId: session.tenantId,
        submissionId: submission_id,
        score: score.toString(),
        feedback,
        grade,
        gradedBy: session.userId,
        gradedAt: new Date(),
      };

      await db.insert(grades).values(insertData).returning();

      return {
        content: [
          {
            type: 'text',
            text: `Submission graded\nScore: ${score}\n${feedback ? `Feedback: ${feedback}` : ''}`,
          },
        ],
      };
    }
  );

  // Resource: teacher://my_classes
  server.resource(
    'my_classes',
    'teacher://my_classes',
    {
      mimeType: 'application/json',
    },
    async (uri, extra) => {
      const session = getSessionFromContext(extra);

      // Fetch teacher's classes (simplified - would access DB)
      const data = {
        teacherId: session.userId,
        classes: [],
        message: 'This resource would return actual classes from DB',
      };

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  // Prompt: teacher_persona
  server.prompt('teacher_persona', 'Teacher assistant persona', async () => {
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
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Teacher MCP] Server started on stdio');
}

main().catch(error => {
  console.error('[Teacher MCP] Fatal error:', error);
  process.exit(1);
});
