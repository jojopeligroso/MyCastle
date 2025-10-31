#!/usr/bin/env node
/**
 * Teacher MCP Server
 *
 * Provides tools, resources, and prompts for the teacher AI assistant
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
    name: 'teacher-assistant-server',
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
// Resources - Read-only contextual data for the teacher
// ============================================================================

const TEACHER_RESOURCES = [
  {
    uri: 'teacher://class-roster',
    name: 'Class Roster',
    description: 'List of students and their basic information',
    mimeType: 'application/json',
  },
  {
    uri: 'teacher://curriculum',
    name: 'Curriculum Standards',
    description: 'Course syllabus and learning objectives',
    mimeType: 'application/json',
  },
  {
    uri: 'teacher://performance-analytics',
    name: 'Class Performance Analytics',
    description: 'Aggregated class performance data and trends',
    mimeType: 'application/json',
  },
  {
    uri: 'teacher://content-library',
    name: 'Content Library',
    description: 'Available teaching materials and resources',
    mimeType: 'application/json',
  },
];

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: TEACHER_RESOURCES,
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  const resourceData: Record<string, any> = {
    'teacher://class-roster': {
      className: 'ESL Advanced - Period 3',
      totalStudents: 24,
      students: [
        { id: 's1', name: 'John Doe', gradeLevel: 10, status: 'active' },
        { id: 's2', name: 'Jane Smith', gradeLevel: 10, status: 'active' },
        { id: 's3', name: 'Mike Johnson', gradeLevel: 10, status: 'active' },
        // More students...
      ],
    },
    'teacher://curriculum': {
      courseName: 'ESL Advanced',
      gradeLevel: 10,
      objectives: [
        'Master advanced grammar structures',
        'Develop academic writing skills',
        'Improve reading comprehension',
        'Build advanced vocabulary',
      ],
      units: [
        {
          unit: 1,
          topic: 'Advanced Verb Tenses',
          weeks: 4,
          standards: ['9-10.L.1', '9-10.L.3'],
        },
        {
          unit: 2,
          topic: 'Academic Writing',
          weeks: 5,
          standards: ['9-10.W.1', '9-10.W.4'],
        },
      ],
    },
    'teacher://performance-analytics': {
      classAverage: 75,
      gradeDistribution: {
        A: 5,
        B: 8,
        C: 7,
        D: 3,
        F: 1,
      },
      recentAssignments: [
        {
          name: 'Grammar Quiz 5',
          average: 78,
          completionRate: 96,
          difficultQuestions: [3, 7, 9],
        },
        {
          name: 'Writing Exercise 3',
          average: 72,
          completionRate: 88,
          commonIssues: ['Thesis statements', 'Paragraph structure'],
        },
      ],
      trendingConcepts: {
        struggling: ['Past Perfect', 'Conditional Sentences', 'Phrasal Verbs'],
        improving: ['Present Tenses', 'Question Formation'],
      },
    },
    'teacher://content-library': {
      categories: [
        {
          name: 'Lesson Plans',
          count: 45,
          recentItems: [
            'Advanced Grammar - Past Perfect',
            'Academic Writing Introduction',
          ],
        },
        {
          name: 'Quiz Templates',
          count: 78,
          recentItems: ['Verb Tenses Quiz', 'Vocabulary Assessment'],
        },
        {
          name: 'Worksheets',
          count: 120,
          recentItems: ['Practice Exercises - Conditionals', 'Reading Comprehension'],
        },
      ],
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
        name: 'generateQuiz',
        description: 'Create quiz questions for a specific topic',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Topic for the quiz',
            },
            difficulty: {
              type: 'string',
              description: 'Difficulty level (easy, medium, hard)',
              enum: ['easy', 'medium', 'hard'],
            },
            numberOfQuestions: {
              type: 'number',
              description: 'Number of questions to generate',
              default: 10,
            },
          },
          required: ['topic'],
        },
      },
      {
        name: 'createLessonPlan',
        description: 'Generate a lesson plan outline for a topic',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Lesson topic',
            },
            duration: {
              type: 'number',
              description: 'Duration in minutes',
              default: 45,
            },
            objectives: {
              type: 'array',
              items: { type: 'string' },
              description: 'Learning objectives',
            },
          },
          required: ['topic'],
        },
      },
      {
        name: 'gradeAssignment',
        description: 'Automatically grade an assignment based on rubric',
        inputSchema: {
          type: 'object',
          properties: {
            assignmentId: {
              type: 'string',
              description: 'Assignment identifier',
            },
            rubricId: {
              type: 'string',
              description: 'Rubric to use for grading',
            },
          },
          required: ['assignmentId'],
        },
      },
      {
        name: 'analyzePerformance',
        description: 'Analyze student or class performance',
        inputSchema: {
          type: 'object',
          properties: {
            studentId: {
              type: 'string',
              description: 'Student ID (optional - if not provided, analyzes entire class)',
            },
            timeframe: {
              type: 'string',
              description: 'Time period to analyze (week, month, semester)',
              default: 'month',
            },
          },
        },
      },
      {
        name: 'sendAnnouncement',
        description: 'Send an announcement to students',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Announcement message',
            },
            recipients: {
              type: 'string',
              description: 'Recipients (all, specific student IDs)',
              default: 'all',
            },
          },
          required: ['message'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'generateQuiz': {
      const topic = args?.topic as string;
      const difficulty = (args?.difficulty as string) || 'medium';
      const count = (args?.numberOfQuestions as number) || 10;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                topic,
                difficulty,
                questions: [
                  {
                    id: 'q1',
                    type: 'multiple-choice',
                    question: `Which sentence correctly uses ${topic}?`,
                    options: [
                      'I had finished my homework before dinner.',
                      'I have finished my homework before dinner.',
                      'I finished my homework before dinner.',
                      'I finish my homework before dinner.',
                    ],
                    correctAnswer: 0,
                    explanation: 'Past perfect is used for an action completed before another past action.',
                  },
                  {
                    id: 'q2',
                    type: 'fill-in-blank',
                    question: 'By the time I arrived, they _____ already _____. (leave)',
                    correctAnswer: 'had, left',
                    explanation: 'Past perfect: had + past participle',
                  },
                  {
                    id: 'q3',
                    type: 'short-answer',
                    question: `Write a sentence using ${topic} correctly.`,
                    rubric: 'Correct form, appropriate context, clear meaning',
                  },
                ].slice(0, count),
                metadata: {
                  estimatedTime: count * 2,
                  totalPoints: count * 10,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'createLessonPlan': {
      const topic = args?.topic as string;
      const duration = (args?.duration as number) || 45;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                topic,
                duration,
                structure: {
                  introduction: {
                    time: Math.floor(duration * 0.15),
                    activities: [
                      'Review previous lesson',
                      'Introduce today\'s topic with real-world example',
                      'State learning objectives',
                    ],
                  },
                  directInstruction: {
                    time: Math.floor(duration * 0.3),
                    activities: [
                      `Explain ${topic} with examples`,
                      'Show sentence structures',
                      'Demonstrate with timeline if appropriate',
                    ],
                  },
                  guidedPractice: {
                    time: Math.floor(duration * 0.3),
                    activities: [
                      'Work through examples together',
                      'Students complete practice sentences',
                      'Check for understanding',
                    ],
                  },
                  independentPractice: {
                    time: Math.floor(duration * 0.15),
                    activities: [
                      'Students complete worksheet',
                      'Write original sentences',
                      'Peer review',
                    ],
                  },
                  closure: {
                    time: Math.floor(duration * 0.1),
                    activities: [
                      'Review key points',
                      'Answer questions',
                      'Assign homework',
                    ],
                  },
                },
                materials: [
                  'Textbook',
                  'Practice worksheet',
                  'Whiteboard/projector',
                  'Example sentences handout',
                ],
                differentiation: [
                  'Extra support: Provide sentence frames',
                  'Extension: Have students create short narrative',
                ],
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'gradeAssignment': {
      const assignmentId = args?.assignmentId as string;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                assignmentId,
                gradingReport: {
                  totalSubmissions: 24,
                  graded: 24,
                  averageScore: 78,
                  distribution: {
                    '90-100': 5,
                    '80-89': 8,
                    '70-79': 7,
                    '60-69': 3,
                    'Below 60': 1,
                  },
                  commonIssues: [
                    'Incorrect verb forms (12 students)',
                    'Timeline confusion (8 students)',
                    'Missing auxiliary verb (5 students)',
                  ],
                  recommendations: [
                    'Review past participle formation',
                    'Provide more timeline visualization',
                    'Practice exercises on auxiliary verbs',
                  ],
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'analyzePerformance': {
      const studentId = args?.studentId as string | undefined;
      const timeframe = (args?.timeframe as string) || 'month';

      if (studentId) {
        // Individual student analysis
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  studentId,
                  timeframe,
                  analysis: {
                    overallScore: 78,
                    trend: 'improving',
                    strengths: ['Question formation', 'Vocabulary usage', 'Reading comprehension'],
                    weaknesses: ['Past perfect tense', 'Conditional sentences'],
                    recentScores: [
                      { date: '2025-10-25', assignment: 'Quiz 5', score: 85 },
                      { date: '2025-10-28', assignment: 'Vocab Test', score: 72 },
                      { date: '2025-10-30', assignment: 'Writing', score: 80 },
                    ],
                    attendance: '95%',
                    participation: 'High',
                    recommendations: [
                      'Continue current pace',
                      'Focus on past perfect tense practice',
                      'Encourage participation in conditional exercises',
                    ],
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        // Class-wide analysis
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  timeframe,
                  classAnalysis: {
                    averageScore: 75,
                    medianScore: 77,
                    trend: 'stable',
                    conceptsMastered: ['Present tenses', 'Question formation', 'Basic vocabulary'],
                    conceptsNeedingWork: [
                      'Past perfect tense',
                      'Conditional sentences',
                      'Phrasal verbs',
                    ],
                    topPerformers: ['s1', 's5', 's12'],
                    needsSupport: ['s3', 's15', 's20'],
                    engagement: {
                      averageAssignmentCompletion: 92,
                      averageParticipation: 78,
                      questionActivity: 'High',
                    },
                    recommendations: [
                      'Plan review session for past perfect',
                      'Provide additional support for struggling students',
                      'Continue current teaching strategies for strong areas',
                    ],
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }

    case 'sendAnnouncement': {
      const message = args?.message as string;
      const recipients = (args?.recipients as string) || 'all';

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'sent',
                message,
                recipients,
                timestamp: new Date().toISOString(),
                deliveryMethod: 'platform-notification',
                recipientCount: recipients === 'all' ? 24 : 1,
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
        description: 'Default teacher assistant persona and guidelines',
      },
      {
        name: 'content-creator',
        description: 'Optimized for creating educational content',
      },
      {
        name: 'data-analyst',
        description: 'Optimized for analyzing student performance data',
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;

  switch (name) {
    case 'default':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are a teaching assistant AI helping an educator.

Your role:
- Provide clear, concise information and suggestions
- Help create educational content (quizzes, lesson plans, worksheets)
- Analyze student performance and provide insights
- Assist with classroom management tasks
- Offer evidence-based teaching strategies

Guidelines:
- Be professional and supportive
- Format content clearly and consistently
- Align with educational standards and best practices
- Cite data when providing analytics
- Respect teacher expertise - offer suggestions, not mandates
- Be efficient - teachers have limited time
- Consider diverse learning needs in your suggestions

When creating content:
- Follow curriculum standards
- Include learning objectives
- Provide clear instructions
- Consider different difficulty levels
- Include assessment criteria when appropriate`,
            },
          },
        ],
      };

    case 'content-creator':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are in content creation mode. Focus on generating high-quality educational materials.

Content creation principles:
- Align with curriculum standards and learning objectives
- Include clear instructions and examples
- Vary question types and difficulty levels
- Provide answer keys and rubrics
- Format content professionally
- Consider time requirements
- Include differentiation strategies

Quality checklist:
- Clear learning objectives stated
- Appropriate for grade level
- Engaging and relevant to students
- Accurate content
- Properly formatted
- Includes assessment criteria`,
            },
          },
        ],
      };

    case 'data-analyst':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are in data analysis mode. Focus on extracting actionable insights from student performance data.

Analysis approach:
- Identify trends and patterns
- Highlight both strengths and areas needing improvement
- Compare against benchmarks and standards
- Look for equity gaps or disparities
- Consider multiple data points

Reporting format:
- Present key findings clearly
- Use specific numbers and percentages
- Organize by priority/impact
- Provide actionable recommendations
- Suggest specific interventions
- Format data in tables when helpful

Remember: Data should drive instruction but consider the whole student.`,
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
  console.error('Teacher MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
