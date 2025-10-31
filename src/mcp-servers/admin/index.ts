#!/usr/bin/env node
/**
 * Admin MCP Server
 *
 * Provides tools, resources, and prompts for the admin AI assistant
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
    name: 'admin-assistant-server',
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
// Resources - Read-only contextual data for admin
// ============================================================================

const ADMIN_RESOURCES = [
  {
    uri: 'admin://usage-statistics',
    name: 'Platform Usage Statistics',
    description: 'User counts, active sessions, and engagement metrics',
    mimeType: 'application/json',
  },
  {
    uri: 'admin://performance-metrics',
    name: 'Performance Metrics',
    description: 'Aggregated student outcomes and success rates',
    mimeType: 'application/json',
  },
  {
    uri: 'admin://content-repository',
    name: 'Content Repository Info',
    description: 'Available courses, completion rates, and ratings',
    mimeType: 'application/json',
  },
  {
    uri: 'admin://system-status',
    name: 'System Status',
    description: 'System health, uptime, and performance metrics',
    mimeType: 'application/json',
  },
];

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: ADMIN_RESOURCES,
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  const resourceData: Record<string, any> = {
    'admin://usage-statistics': {
      period: 'Last 30 days',
      users: {
        total: 1250,
        active: 892,
        new: 145,
        byRole: {
          students: 1050,
          teachers: 180,
          admins: 20,
        },
      },
      sessions: {
        total: 15420,
        averagePerDay: 514,
        averageDuration: '18 minutes',
        peakHours: ['14:00-16:00', '19:00-21:00'],
      },
      engagement: {
        dailyActiveUsers: 425,
        weeklyActiveUsers: 892,
        monthlyActiveUsers: 1100,
        returnRate: '72%',
      },
      trends: {
        userGrowth: '+12% month-over-month',
        engagementTrend: '+8% month-over-month',
        retentionRate: '85%',
      },
    },
    'admin://performance-metrics': {
      period: 'Last 30 days',
      studentOutcomes: {
        averageImprovement: '+15%',
        coursesCompleted: 324,
        averageCompletionRate: '78%',
        averageScore: 76,
      },
      successMetrics: {
        studentsImproving: '82%',
        studentsOnTrack: '75%',
        studentsNeedingSupport: '18%',
      },
      popularCourses: [
        { name: 'ESL Advanced', enrollments: 450, completionRate: '82%', rating: 4.5 },
        { name: 'Grammar Fundamentals', enrollments: 380, completionRate: '78%', rating: 4.3 },
        { name: 'Academic Writing', enrollments: 320, completionRate: '75%', rating: 4.6 },
      ],
      teacherActivity: {
        contentCreated: 245,
        quizzesGenerated: 890,
        studentsHelped: 1050,
        averageResponseTime: '4 hours',
      },
    },
    'admin://content-repository': {
      totalCourses: 45,
      activeCourses: 38,
      draftCourses: 7,
      statistics: {
        totalLessons: 1250,
        totalQuizzes: 890,
        totalWorksheets: 1540,
        totalResources: 3200,
      },
      topRatedContent: [
        {
          title: 'Advanced Grammar Series',
          type: 'course',
          rating: 4.8,
          enrollments: 450,
        },
        {
          title: 'Interactive Vocabulary Builder',
          type: 'tool',
          rating: 4.7,
          usage: 12500,
        },
      ],
      needsReview: [
        {
          title: 'Basic Pronunciation',
          issue: 'Low completion rate (45%)',
          priority: 'high',
        },
        {
          title: 'Business English',
          issue: 'Outdated content',
          priority: 'medium',
        },
      ],
    },
    'admin://system-status': {
      timestamp: new Date().toISOString(),
      overallStatus: 'healthy',
      components: {
        database: {
          status: 'operational',
          uptime: '99.98%',
          responseTime: '45ms',
        },
        mcpHost: {
          status: 'operational',
          activeConnections: 234,
          uptime: '99.95%',
        },
        llmService: {
          status: 'operational',
          requestsPerMinute: 45,
          averageLatency: '1.2s',
          tokensUsedToday: 1250000,
        },
        mcpServers: {
          student: { status: 'operational', uptime: '99.97%' },
          teacher: { status: 'operational', uptime: '99.96%' },
          admin: { status: 'operational', uptime: '99.99%' },
        },
      },
      alerts: [],
      lastIncident: '2025-10-15 - Database maintenance (scheduled)',
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
        name: 'generateReport',
        description: 'Generate a formatted report of specified type',
        inputSchema: {
          type: 'object',
          properties: {
            reportType: {
              type: 'string',
              description: 'Type of report (usage, performance, financial, content)',
              enum: ['usage', 'performance', 'financial', 'content'],
            },
            timeframe: {
              type: 'string',
              description: 'Time period for the report',
              default: 'month',
            },
            format: {
              type: 'string',
              description: 'Output format (summary, detailed)',
              enum: ['summary', 'detailed'],
              default: 'summary',
            },
          },
          required: ['reportType'],
        },
      },
      {
        name: 'manageContent',
        description: 'Perform content management actions',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'Action to perform',
              enum: ['publish', 'unpublish', 'archive', 'update-metadata'],
            },
            contentId: {
              type: 'string',
              description: 'Content identifier',
            },
            metadata: {
              type: 'object',
              description: 'Metadata for update action',
            },
          },
          required: ['action', 'contentId'],
        },
      },
      {
        name: 'userManagement',
        description: 'Manage user accounts',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'User management action',
              enum: ['reset-password', 'deactivate', 'reactivate', 'change-role'],
            },
            userId: {
              type: 'string',
              description: 'User identifier',
            },
            newRole: {
              type: 'string',
              description: 'New role (for change-role action)',
              enum: ['student', 'teacher', 'admin'],
            },
          },
          required: ['action', 'userId'],
        },
      },
      {
        name: 'fetchFeedback',
        description: 'Retrieve and analyze user feedback',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for feedback',
            },
            filter: {
              type: 'string',
              description: 'Filter by category or sentiment',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 10,
            },
          },
        },
      },
      {
        name: 'systemStatusCheck',
        description: 'Check health status of system components',
        inputSchema: {
          type: 'object',
          properties: {
            component: {
              type: 'string',
              description: 'Component to check (or "all" for full status)',
              default: 'all',
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
    case 'generateReport': {
      const reportType = args?.reportType as string;
      const timeframe = (args?.timeframe as string) || 'month';
      const format = (args?.format as string) || 'summary';

      const reports: Record<string, any> = {
        usage: {
          title: `Platform Usage Report - ${timeframe}`,
          summary: {
            totalUsers: 1250,
            activeUsers: 892,
            newUsers: 145,
            totalSessions: 15420,
            averageSessionDuration: '18 minutes',
            userGrowth: '+12%',
          },
          keyMetrics: [
            'Daily active users: 425 (average)',
            'Weekly active users: 892',
            'User retention rate: 85%',
            'Peak usage: 14:00-16:00 and 19:00-21:00',
          ],
          insights: [
            'Strong user growth continuing',
            'High engagement during afternoon and evening',
            'Excellent retention rate above industry average',
          ],
        },
        performance: {
          title: `Performance Report - ${timeframe}`,
          summary: {
            averageStudentImprovement: '+15%',
            coursesCompleted: 324,
            averageCompletionRate: '78%',
            studentSatisfaction: '4.5/5',
          },
          topPerformingContent: [
            'ESL Advanced (82% completion, 4.5 rating)',
            'Academic Writing (75% completion, 4.6 rating)',
          ],
          areasForImprovement: [
            'Basic Pronunciation course has low completion rate (45%)',
            '18% of students need additional support',
          ],
          recommendations: [
            'Review and update Basic Pronunciation content',
            'Implement additional support resources for struggling students',
          ],
        },
        financial: {
          title: `Financial Report - ${timeframe}`,
          summary: {
            revenue: '$45,230',
            subscriptions: 892,
            averageRevenuePerUser: '$50.70',
            llmCosts: '$8,450',
          },
          breakdown: {
            studentSubscriptions: '$38,200 (845 users)',
            teacherSubscriptions: '$6,300 (45 users)',
            enterpriseAccounts: '$730 (2 schools)',
          },
          costs: {
            llmApiCalls: '$8,450',
            infrastructure: '$2,200',
            other: '$800',
          },
          netProfit: '$33,780',
        },
        content: {
          title: `Content Report - ${timeframe}`,
          summary: {
            totalCourses: 45,
            activeCourses: 38,
            newContentAdded: 145,
            contentRating: '4.4/5 average',
          },
          usage: [
            'Most popular: ESL Advanced (450 enrollments)',
            'Highest rated: Academic Writing (4.6/5)',
            'Needs attention: Basic Pronunciation (45% completion)',
          ],
          recommendations: [
            'Continue developing advanced content',
            'Update or retire underperforming courses',
            'Create more interactive elements',
          ],
        },
      };

      const report = reports[reportType];
      if (!report) {
        throw new Error(`Unknown report type: ${reportType}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...report,
                format,
                generatedAt: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'manageContent': {
      const action = args?.action as string;
      const contentId = args?.contentId as string;
      const metadata = args?.metadata;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'success',
                action,
                contentId,
                message: `Content ${contentId} ${action} completed successfully`,
                timestamp: new Date().toISOString(),
                updatedMetadata: metadata || null,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'userManagement': {
      const action = args?.action as string;
      const userId = args?.userId as string;
      const newRole = args?.newRole as string | undefined;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'success',
                action,
                userId,
                message: `User ${userId} ${action} completed successfully`,
                newRole: newRole || null,
                timestamp: new Date().toISOString(),
                notification: 'User has been notified via email',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'fetchFeedback': {
      const query = (args?.query as string) || '';
      const filter = args?.filter as string | undefined;
      const limit = (args?.limit as number) || 10;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                query,
                filter,
                totalResults: 48,
                results: [
                  {
                    id: 'fb1',
                    user: 'student-s123',
                    date: '2025-10-28',
                    category: 'feature-request',
                    sentiment: 'positive',
                    text: 'Love the AI tutor! Would be great to have voice practice too.',
                    rating: 5,
                  },
                  {
                    id: 'fb2',
                    user: 'teacher-t45',
                    date: '2025-10-27',
                    category: 'bug-report',
                    sentiment: 'negative',
                    text: 'Quiz generator sometimes creates duplicate questions.',
                    rating: 3,
                  },
                  {
                    id: 'fb3',
                    user: 'student-s456',
                    date: '2025-10-27',
                    category: 'general',
                    sentiment: 'positive',
                    text: 'The practice exercises are really helpful. Improved my grammar a lot!',
                    rating: 5,
                  },
                  {
                    id: 'fb4',
                    user: 'teacher-t12',
                    date: '2025-10-26',
                    category: 'feature-request',
                    sentiment: 'neutral',
                    text: 'Would like more customization options for lesson plans.',
                    rating: 4,
                  },
                ].slice(0, limit),
                summary: {
                  averageRating: 4.2,
                  sentimentBreakdown: {
                    positive: 28,
                    neutral: 12,
                    negative: 8,
                  },
                  topCategories: [
                    'feature-request (20)',
                    'general (15)',
                    'bug-report (8)',
                    'content-suggestion (5)',
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

    case 'systemStatusCheck': {
      const component = (args?.component as string) || 'all';

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                timestamp: new Date().toISOString(),
                requestedComponent: component,
                overallStatus: 'healthy',
                components: {
                  database: {
                    status: 'operational',
                    uptime: '99.98%',
                    latency: '45ms',
                    connections: 234,
                  },
                  mcpHost: {
                    status: 'operational',
                    uptime: '99.95%',
                    activeSessions: 234,
                    memoryUsage: '62%',
                  },
                  llmService: {
                    status: 'operational',
                    requestsPerMinute: 45,
                    averageLatency: '1.2s',
                    errorRate: '0.02%',
                  },
                  mcpServers: {
                    student: { status: 'operational', activeConnections: 150 },
                    teacher: { status: 'operational', activeConnections: 72 },
                    admin: { status: 'operational', activeConnections: 12 },
                  },
                },
                alerts: [],
                recentEvents: [
                  'System health check completed successfully (2025-10-30 14:00)',
                  'Scheduled backup completed (2025-10-30 02:00)',
                ],
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
        description: 'Default admin assistant persona and guidelines',
      },
      {
        name: 'analytics',
        description: 'Optimized for data analysis and insights',
      },
      {
        name: 'operations',
        description: 'Optimized for operational tasks and system management',
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
              text: `You are an AI administrative assistant for an educational platform.

Your role:
- Provide analytical insights and reports
- Help manage the platform and users
- Monitor system health and performance
- Assist with data-driven decision making
- Handle administrative tasks efficiently

Guidelines:
- Be concise and factual in your responses
- Use a professional, formal tone
- When presenting statistics, format them clearly (use tables/lists)
- Provide actionable recommendations based on data
- Double-check before executing critical actions
- Consider business objectives and user impact
- Maintain confidentiality and data privacy

Communication style:
- Clear and direct
- Data-driven
- Business-focused
- Professional
- Solution-oriented`,
            },
          },
        ],
      };

    case 'analytics':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are in analytics mode. Focus on extracting insights from platform data.

Analysis framework:
- Identify key metrics and trends
- Compare against benchmarks and goals
- Highlight opportunities and risks
- Provide context for numbers
- Consider multiple perspectives

Reporting format:
- Executive summary first
- Key findings with supporting data
- Visual representation suggestions (charts, graphs)
- Actionable recommendations
- Priority ranking

Areas to analyze:
- User growth and engagement
- Revenue and costs
- Content performance
- System reliability
- User satisfaction

Remember: Focus on insights that drive business decisions.`,
            },
          },
        ],
      };

    case 'operations':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are in operations mode. Focus on system management and administrative tasks.

Operational priorities:
- System reliability and uptime
- User experience and satisfaction
- Data security and privacy
- Efficient resource utilization
- Incident prevention and response

Before taking action:
- Verify the request is authorized
- Assess potential impact
- Confirm critical operations
- Document changes made
- Communicate with affected users if needed

Task categories:
- User management (with appropriate safeguards)
- Content management (publishing, archiving)
- System monitoring and alerts
- Backup and maintenance coordination
- Support ticket triage

Safety guidelines:
- Never delete data without confirmation
- Always backup before major changes
- Respect user privacy
- Log all administrative actions
- Escalate sensitive issues`,
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
  console.error('Admin MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
