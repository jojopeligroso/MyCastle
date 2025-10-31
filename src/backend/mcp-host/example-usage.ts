/**
 * Example Usage of MCP Host
 *
 * This file demonstrates how to use the MCP Host to orchestrate
 * AI conversations with different user roles
 */

import { MCPHost, createMCPHost, MCPHostConfig } from './index';
import path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const config: MCPHostConfig = {
  // LLM Configuration
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
    model: 'gpt-4',
    defaultTemperature: 0.7,
    defaultMaxTokens: 2048,
  },

  // MCP Server Configurations
  servers: {
    student: {
      command: 'node',
      args: [path.join(__dirname, '../../mcp-servers/student/index.js')],
      env: {},
    },
    teacher: {
      command: 'node',
      args: [path.join(__dirname, '../../mcp-servers/teacher/index.js')],
      env: {},
    },
    admin: {
      command: 'node',
      args: [path.join(__dirname, '../../mcp-servers/admin/index.js')],
      env: {},
    },
  },

  // Session Configuration
  session: {
    maxHistoryLength: 50,
    inactivityTimeout: 30 * 60 * 1000, // 30 minutes
  },

  // Retry Configuration
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
  },
};

// ============================================================================
// Example 1: Student Session
// ============================================================================

async function exampleStudentSession() {
  console.log('\n=== Example 1: Student Session ===\n');

  const host = createMCPHost(config);

  try {
    // Start a session for a student
    const session = await host.startSession('student-123', 'student', {
      studentName: 'John Doe',
      gradeLevel: 10,
    });

    console.log(`Session started: ${session.id}`);
    console.log(`User: ${session.userId}, Role: ${session.role}\n`);

    // Student asks a question
    console.log('Student: Can you explain the past perfect tense to me?');
    const response1 = await host.processUserMessage(
      session.id,
      'Can you explain the past perfect tense to me?'
    );
    console.log(`AI Tutor: ${response1.response}\n`);
    console.log(`[Tool calls: ${response1.toolCallsExecuted}, Tokens: ${response1.tokensUsed}]\n`);

    // Student asks for practice
    console.log('Student: Can I get some practice questions on this topic?');
    const response2 = await host.processUserMessage(
      session.id,
      'Can I get some practice questions on this topic?'
    );
    console.log(`AI Tutor: ${response2.response}\n`);
    console.log(`[Tool calls: ${response2.toolCallsExecuted}, Tokens: ${response2.tokensUsed}]\n`);

    // End the session
    await host.endSession(session.id);
    console.log('Session ended');
  } catch (error) {
    console.error('Error in student session:', error);
  } finally {
    await host.shutdown();
  }
}

// ============================================================================
// Example 2: Teacher Session
// ============================================================================

async function exampleTeacherSession() {
  console.log('\n=== Example 2: Teacher Session ===\n');

  const host = createMCPHost(config);

  try {
    // Start a session for a teacher
    const session = await host.startSession('teacher-456', 'teacher', {
      teacherName: 'Ms. Smith',
      classes: ['ESL Advanced - Period 3'],
    });

    console.log(`Session started: ${session.id}`);
    console.log(`User: ${session.userId}, Role: ${session.role}\n`);

    // Teacher requests quiz generation
    console.log('Teacher: Create a 5-question quiz on past perfect tense, medium difficulty');
    const response1 = await host.processUserMessage(
      session.id,
      'Create a 5-question quiz on past perfect tense, medium difficulty'
    );
    console.log(`AI Assistant: ${response1.response}\n`);
    console.log(`[Tool calls: ${response1.toolCallsExecuted}, Tokens: ${response1.tokensUsed}]\n`);

    // Teacher asks for class analytics
    console.log('Teacher: How is my class performing overall?');
    const response2 = await host.processUserMessage(
      session.id,
      'How is my class performing overall?'
    );
    console.log(`AI Assistant: ${response2.response}\n`);
    console.log(`[Tool calls: ${response2.toolCallsExecuted}, Tokens: ${response2.tokensUsed}]\n`);

    // End the session
    await host.endSession(session.id);
    console.log('Session ended');
  } catch (error) {
    console.error('Error in teacher session:', error);
  } finally {
    await host.shutdown();
  }
}

// ============================================================================
// Example 3: Admin Session
// ============================================================================

async function exampleAdminSession() {
  console.log('\n=== Example 3: Admin Session ===\n');

  const host = createMCPHost(config);

  try {
    // Start a session for an admin
    const session = await host.startSession('admin-789', 'admin', {
      adminName: 'System Administrator',
    });

    console.log(`Session started: ${session.id}`);
    console.log(`User: ${session.userId}, Role: ${session.role}\n`);

    // Admin requests usage report
    console.log('Admin: Generate a usage report for the last month');
    const response1 = await host.processUserMessage(
      session.id,
      'Generate a usage report for the last month'
    );
    console.log(`AI Assistant: ${response1.response}\n`);
    console.log(`[Tool calls: ${response1.toolCallsExecuted}, Tokens: ${response1.tokensUsed}]\n`);

    // Admin checks system status
    console.log('Admin: What is the current system status?');
    const response2 = await host.processUserMessage(
      session.id,
      'What is the current system status?'
    );
    console.log(`AI Assistant: ${response2.response}\n`);
    console.log(`[Tool calls: ${response2.toolCallsExecuted}, Tokens: ${response2.tokensUsed}]\n`);

    // End the session
    await host.endSession(session.id);
    console.log('Session ended');
  } catch (error) {
    console.error('Error in admin session:', error);
  } finally {
    await host.shutdown();
  }
}

// ============================================================================
// Example 4: Multiple Concurrent Sessions
// ============================================================================

async function exampleMultipleSessions() {
  console.log('\n=== Example 4: Multiple Concurrent Sessions ===\n');

  const host = createMCPHost(config);

  try {
    // Start multiple sessions
    const studentSession = await host.startSession('student-001', 'student');
    const teacherSession = await host.startSession('teacher-001', 'teacher');
    const adminSession = await host.startSession('admin-001', 'admin');

    console.log('Started 3 concurrent sessions:\n');
    console.log(`- Student: ${studentSession.id}`);
    console.log(`- Teacher: ${teacherSession.id}`);
    console.log(`- Admin: ${adminSession.id}\n`);

    // Process messages concurrently
    console.log('Processing messages concurrently...\n');

    const [studentResponse, teacherResponse, adminResponse] = await Promise.all([
      host.processUserMessage(studentSession.id, 'Help me understand conditionals'),
      host.processUserMessage(teacherSession.id, 'Create a lesson plan for conditionals'),
      host.processUserMessage(adminSession.id, 'How many users are active today?'),
    ]);

    console.log('Student response received');
    console.log('Teacher response received');
    console.log('Admin response received\n');

    // Get host statistics
    const stats = host.getStats();
    console.log('Host Statistics:');
    console.log(JSON.stringify(stats, null, 2));

    // Clean up
    await host.endSession(studentSession.id);
    await host.endSession(teacherSession.id);
    await host.endSession(adminSession.id);
    console.log('\nAll sessions ended');
  } catch (error) {
    console.error('Error in multiple sessions:', error);
  } finally {
    await host.shutdown();
  }
}

// ============================================================================
// Example 5: Error Handling
// ============================================================================

async function exampleErrorHandling() {
  console.log('\n=== Example 5: Error Handling ===\n');

  const host = createMCPHost(config);

  try {
    const session = await host.startSession('student-999', 'student');

    // Try to process an empty message
    try {
      await host.processUserMessage(session.id, '');
    } catch (error) {
      console.log('Caught error for empty message:', (error as Error).message);
    }

    // Try to access non-existent session
    try {
      await host.processUserMessage('invalid-session-id', 'Hello');
    } catch (error) {
      console.log('Caught error for invalid session:', (error as Error).message);
    }

    // Try to end non-existent session
    try {
      await host.endSession('invalid-session-id');
    } catch (error) {
      console.log('Caught error for ending invalid session:', (error as Error).message);
    }

    await host.endSession(session.id);
  } catch (error) {
    console.error('Error in error handling example:', error);
  } finally {
    await host.shutdown();
  }
}

// ============================================================================
// Example 6: Session Persistence
// ============================================================================

async function exampleSessionPersistence() {
  console.log('\n=== Example 6: Session Persistence ===\n');

  const host = createMCPHost(config);

  try {
    const session = await host.startSession('student-777', 'student');
    console.log(`Session created: ${session.id}\n`);

    // Have a conversation
    console.log('Message 1: What is the present perfect tense?');
    await host.processUserMessage(
      session.id,
      'What is the present perfect tense?'
    );

    console.log('Message 2: Can you give me examples?');
    await host.processUserMessage(
      session.id,
      'Can you give me examples?'
    );

    console.log('Message 3: I still don\'t understand');
    await host.processUserMessage(
      session.id,
      'I still don\'t understand'
    );

    // Get conversation history
    const retrievedSession = host.getSession(session.id);
    if (retrievedSession) {
      console.log(`\nConversation history length: ${retrievedSession.conversationHistory.length}`);
      console.log('Last 3 messages:');
      retrievedSession.conversationHistory.slice(-3).forEach((msg, idx) => {
        console.log(`  ${idx + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
      });
    }

    // Clear history
    host.clearHistory(session.id);
    console.log('\nHistory cleared');

    const clearedSession = host.getSession(session.id);
    console.log(`History length after clear: ${clearedSession?.conversationHistory.length}`);

    await host.endSession(session.id);
  } catch (error) {
    console.error('Error in session persistence example:', error);
  } finally {
    await host.shutdown();
  }
}

// ============================================================================
// Main - Run Examples
// ============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('MCP Host - Example Usage');
  console.log('='.repeat(70));

  // Uncomment the examples you want to run:

  // await exampleStudentSession();
  // await exampleTeacherSession();
  // await exampleAdminSession();
  // await exampleMultipleSessions();
  // await exampleErrorHandling();
  // await exampleSessionPersistence();

  console.log('\n' + '='.repeat(70));
  console.log('Examples Complete');
  console.log('='.repeat(70));
  console.log('\nNote: Uncomment the example functions in main() to run them.');
  console.log('Make sure to set your OPENAI_API_KEY environment variable.\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for use in tests
export {
  exampleStudentSession,
  exampleTeacherSession,
  exampleAdminSession,
  exampleMultipleSessions,
  exampleErrorHandling,
  exampleSessionPersistence,
};
