#!/usr/bin/env node
/**
 * Student MCP Server
 *
 * Provides tools, resources, and prompts for the student AI assistant
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Initialize server
const server = new Server(
  {
    name: 'student-assistant-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// ============================================================================
// Resources - Read-only contextual data for the student
// ============================================================================

const STUDENT_RESOURCES = [
  {
    uri: 'student://profile',
    name: 'Student Profile',
    description: 'Basic student information and progress metrics',
    mimeType: 'application/json',
  },
  {
    uri: 'student://current-lesson',
    name: 'Current Lesson',
    description: 'Details of the current lesson or assignment',
    mimeType: 'application/json',
  },
  {
    uri: 'student://performance',
    name: 'Performance Summary',
    description: 'Recent quiz scores and performance metrics',
    mimeType: 'application/json',
  },
];

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: STUDENT_RESOURCES,
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  // Mock data for each resource
  const resourceData: Record<string, any> = {
    'student://profile': {
      name: 'John Doe',
      gradeLevel: 10,
      enrolledCourses: ['ESL Advanced', 'Grammar Fundamentals'],
      progressMetrics: {
        lessonsCompleted: 15,
        averageScore: 78,
        conceptsStruggling: ['Past Perfect Tense', 'Conditional Sentences'],
        conceptsMastered: ['Present Simple', 'Question Formation'],
      },
    },
    'student://current-lesson': {
      topic: 'Past Perfect Tense',
      dueDate: '2025-11-05',
      description: 'Understanding and using the past perfect tense in context',
      materials: ['Textbook Chapter 8', 'Practice Worksheet 8A'],
      objectives: [
        'Form the past perfect tense correctly',
        'Understand when to use past perfect vs simple past',
        'Use past perfect in narrative writing',
      ],
    },
    'student://performance': {
      recentScores: [
        { assignment: 'Grammar Quiz 5', score: 85, date: '2025-10-25' },
        { assignment: 'Vocabulary Test', score: 72, date: '2025-10-28' },
        { assignment: 'Writing Exercise 3', score: 80, date: '2025-10-30' },
      ],
      weeklyProgress: {
        questionsAttempted: 45,
        correctAnswers: 35,
        accuracy: 78,
        improvementTrend: '+5% from last week',
      },
    },
  };

  const data = resourceData[uri];
  if (!data) {
    throw new Error(`Resource not found: ${uri}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
});

// ============================================================================
// Tools - Functions the AI can call
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'searchCourseContent',
        description: 'Search course materials for relevant information',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'getPracticeQuiz',
        description: 'Generate practice questions on a specific topic',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Topic for practice questions',
            },
            count: {
              type: 'number',
              description: 'Number of questions to generate',
              default: 5,
            },
          },
          required: ['topic'],
        },
      },
      {
        name: 'checkSolution',
        description: 'Verify a student answer for a specific problem',
        inputSchema: {
          type: 'object',
          properties: {
            answer: {
              type: 'string',
              description: 'Student answer to check',
            },
            problemId: {
              type: 'string',
              description: 'Identifier for the problem',
            },
          },
          required: ['answer', 'problemId'],
        },
      },
      {
        name: 'summarizePerformance',
        description: 'Get a summary of student performance across recent activities',
        inputSchema: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              description: 'Time period (week, month, all)',
              default: 'week',
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'searchCourseContent': {
      const query = args?.query as string;
      // Mock search results
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [
                  {
                    title: 'Past Perfect Tense Formation',
                    content:
                      'The past perfect tense is formed using "had" + past participle. Example: "I had finished my homework before dinner."',
                    source: 'Textbook Chapter 8, Page 45',
                  },
                  {
                    title: 'When to Use Past Perfect',
                    content:
                      'Use past perfect to show that one action happened before another action in the past.',
                    source: 'Grammar Guide Section 3.4',
                  },
                ],
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'getPracticeQuiz': {
      const topic = args?.topic as string;
      const count = (args?.count as number) || 5;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                topic,
                questions: [
                  {
                    id: 'q1',
                    question:
                      'Complete the sentence: By the time I arrived, they _____ already _____. (leave)',
                    answer: 'had, left',
                  },
                  {
                    id: 'q2',
                    question:
                      'Which is correct? A) I finished before he came. B) I had finished before he came.',
                    answer: 'B',
                  },
                  {
                    id: 'q3',
                    question: 'Form a past perfect sentence using: see/movie/before',
                    answer: 'I had seen the movie before.',
                  },
                ].slice(0, count),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'checkSolution': {
      const answer = args?.answer as string;
      const problemId = args?.problemId as string;

      // Mock answer checking
      const isCorrect = Math.random() > 0.3; // 70% correct rate

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                problemId,
                isCorrect,
                feedback: isCorrect
                  ? 'Excellent! Your answer is correct.'
                  : 'Not quite. Try to think about the timeline of events. Which action happened first?',
                correctAnswer: isCorrect ? null : 'had finished',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'summarizePerformance': {
      const period = (args?.period as string) || 'week';

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                period,
                summary:
                  "You've completed 12 exercises this week with an average score of 78%. That's a 5% improvement from last week! Keep up the good work.",
                strengths: ['Question formation', 'Present tenses', 'Vocabulary usage'],
                areasToImprove: [
                  'Past perfect tense',
                  'Conditional sentences',
                  'Phrasal verbs',
                ],
                recommendation:
                  'Focus on practicing past perfect tense. Try the exercises in Chapter 8.',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ============================================================================
// Prompts - Preset instructions for the AI
// ============================================================================

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'default',
        description: 'Default student tutor persona and guidelines',
      },
      {
        name: 'hint-mode',
        description: 'Provide hints instead of direct answers',
        arguments: [
          {
            name: 'difficulty',
            description: 'Difficulty level of hints (easy, medium, hard)',
            required: false,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'default':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are a friendly AI tutor assisting an ESL student.

Your teaching approach:
- Explain concepts clearly and step-by-step
- Use simple language appropriate for the student's level
- Provide examples to illustrate grammar and vocabulary
- Encourage the student and celebrate their progress
- When the student makes mistakes, gently correct them and explain why
- Adapt your explanations based on what the student already knows
- Be patient and supportive

Guidelines:
- Don't just give answers - help students learn by guiding them
- Use real-world examples and contexts
- Break complex topics into manageable chunks
- Check for understanding by asking follow-up questions
- Encourage practice and repetition
- Make learning engaging and relevant to the student's interests`,
            },
          },
        ],
      };

    case 'hint-mode':
      const difficulty = (args?.difficulty as string) || 'medium';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are providing hints to help a student solve a problem on their own.

Hint level: ${difficulty}

- For "easy" hints: Give direct guidance pointing to the solution
- For "medium" hints: Ask guiding questions and provide relevant examples
- For "hard" hints: Only provide general strategies and let the student work it out

Never give the full answer. Your goal is to guide the student to discover the solution themselves.`,
            },
          },
        ],
      };

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Student MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
