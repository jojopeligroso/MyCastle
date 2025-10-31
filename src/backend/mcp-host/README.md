# MCP Host

The MCP Host is the core orchestration layer for the ESL Learning Platform. It manages AI sessions, coordinates with MCP servers, and integrates with the LLM to provide role-specific AI assistants.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         MCP Host                             │
│                                                               │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Session     │  │   Server     │  │     LLM      │     │
│  │   Manager     │  │   Manager    │  │    Client    │     │
│  └───────────────┘  └──────────────┘  └──────────────┘     │
│           │                  │                 │             │
│           └──────────────────┼─────────────────┘             │
│                              │                               │
│                    ┌─────────▼─────────┐                     │
│                    │  Message Router   │                     │
│                    └───────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌─────▼────┐          ┌────▼────┐
   │ Student │          │ Teacher  │          │  Admin  │
   │  MCP    │          │   MCP    │          │   MCP   │
   │ Server  │          │  Server  │          │  Server │
   └─────────┘          └──────────┘          └─────────┘
```

## Components

### 1. SessionManager (`session-manager.ts`)

Manages AI chat sessions including creation, retrieval, and conversation history.

**Key Methods:**
- `startSession(userId, role, metadata?)`: Create a new session
- `endSession(sessionId)`: End a session and clean up
- `getSession(sessionId)`: Retrieve a session
- `addMessage(sessionId, message)`: Add message to conversation history
- `getConversationHistory(sessionId, limit?)`: Get conversation history
- `clearHistory(sessionId)`: Clear conversation history

**Features:**
- In-memory session storage
- Automatic cleanup of inactive sessions
- Conversation history management with configurable limits
- Session metadata support

### 2. ServerManager (`server-manager.ts`)

Manages connections to MCP servers (student, teacher, admin) and handles communication.

**Key Methods:**
- `connectToServer(serverType)`: Connect to an MCP server
- `disconnectServer(connectionId)`: Disconnect from a server
- `getServerResources(connectionId)`: Get available resources
- `listTools(connectionId)`: List available tools
- `sendToolCall(connectionId, toolName, params)`: Execute a tool
- `listPrompts(connectionId)`: List available prompts
- `getPrompt(connectionId, name, args?)`: Get a specific prompt

**Features:**
- Stdio-based transport for MCP servers
- JSON-RPC 2.0 protocol implementation
- Automatic server lifecycle management
- Connection pooling and reuse
- Request/response correlation with timeouts

### 3. LLMClient (`llm-client.ts`)

Handles communication with Language Model APIs (OpenAI, Anthropic, local models).

**Key Methods:**
- `generate(messages, options?)`: Generate a response from the LLM

**Features:**
- Support for multiple LLM providers (OpenAI, Anthropic, local)
- Tool/function calling support
- Configurable temperature and token limits
- Automatic tool definition conversion from MCP format

### 4. MessageRouter (`message-router.ts`)

Orchestrates the flow of messages between user, MCP servers, and LLM.

**Key Methods:**
- `processUserMessage(sessionId, message, options?)`: Process a complete message flow

**Features:**
- Automatic context gathering from MCP servers
- Multi-turn tool call execution
- Conversation history integration
- Resource and prompt management
- Configurable tool call limits

### 5. MCPHost (`index.ts`)

Main entry point that ties all components together.

**Key Methods:**
- `startSession(userId, role, metadata?)`: Start a new session
- `endSession(sessionId)`: End a session
- `processUserMessage(sessionId, message, options?)`: Process a message
- `getSession(sessionId)`: Get session information
- `getUserSessions(userId)`: Get all sessions for a user
- `clearHistory(sessionId)`: Clear conversation history
- `getStats()`: Get host statistics
- `shutdown()`: Shutdown the host and clean up

## Usage

### Basic Example

```typescript
import { createMCPHost, MCPHostConfig } from './mcp-host';

// Configure the host
const config: MCPHostConfig = {
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
  },
  servers: {
    student: {
      command: 'node',
      args: ['./mcp-servers/student/index.js'],
    },
    teacher: {
      command: 'node',
      args: ['./mcp-servers/teacher/index.js'],
    },
    admin: {
      command: 'node',
      args: ['./mcp-servers/admin/index.js'],
    },
  },
  session: {
    maxHistoryLength: 50,
    inactivityTimeout: 30 * 60 * 1000,
  },
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
  },
};

// Create the host
const host = createMCPHost(config);

// Start a session
const session = await host.startSession('student-123', 'student');

// Process messages
const result = await host.processUserMessage(
  session.id,
  'Can you explain the past perfect tense?'
);

console.log(result.response);

// Clean up
await host.endSession(session.id);
await host.shutdown();
```

### Processing Flow

1. **Session Start**: User initiates a session with a specific role
2. **Server Connection**: Host connects to the appropriate MCP server
3. **Message Processing**:
   - User sends a message
   - Host gathers context (resources, tools, prompts) from MCP server
   - Host builds LLM messages including system prompt and history
   - LLM generates response (may include tool calls)
   - If tool calls requested, host executes them via MCP server
   - Process repeats until LLM provides final response
   - Response returned to user
4. **Session End**: Clean up resources

## MCP Servers

The host connects to three MCP servers:

### Student Server (`/src/mcp-servers/student/`)

**Resources:**
- Student profile and progress
- Current lesson details
- Performance summary

**Tools:**
- `searchCourseContent`: Search course materials
- `getPracticeQuiz`: Generate practice questions
- `checkSolution`: Verify student answers
- `summarizePerformance`: Get performance summary

**Prompts:**
- `default`: Friendly tutor persona
- `hint-mode`: Provide hints instead of answers

### Teacher Server (`/src/mcp-servers/teacher/`)

**Resources:**
- Class roster
- Curriculum standards
- Performance analytics
- Content library

**Tools:**
- `generateQuiz`: Create quiz questions
- `createLessonPlan`: Generate lesson plans
- `gradeAssignment`: Auto-grade assignments
- `analyzePerformance`: Analyze student/class performance
- `sendAnnouncement`: Send announcements to students

**Prompts:**
- `default`: Professional teaching assistant
- `content-creator`: Optimized for content creation
- `data-analyst`: Optimized for performance analysis

### Admin Server (`/src/mcp-servers/admin/`)

**Resources:**
- Usage statistics
- Performance metrics
- Content repository info
- System status

**Tools:**
- `generateReport`: Create various reports
- `manageContent`: Publish/unpublish content
- `userManagement`: Manage user accounts
- `fetchFeedback`: Retrieve user feedback
- `systemStatusCheck`: Check system health

**Prompts:**
- `default`: Professional admin assistant
- `analytics`: Optimized for data analysis
- `operations`: Optimized for system management

## Configuration

### LLM Configuration

```typescript
llm: {
  provider: 'openai' | 'anthropic' | 'local',
  apiKey?: string,
  baseUrl?: string,
  model: string,
  defaultTemperature?: number,
  defaultMaxTokens?: number,
}
```

### Server Configuration

```typescript
servers: {
  [role]: {
    command: string,      // Command to execute
    args: string[],       // Command arguments
    env?: Record<string, string>,  // Environment variables
    cwd?: string,         // Working directory
  }
}
```

### Session Configuration

```typescript
session: {
  maxHistoryLength?: number,      // Max messages to keep (default: 100)
  inactivityTimeout?: number,     // Timeout in ms (default: 30 min)
}
```

### Retry Configuration

```typescript
retry: {
  maxAttempts?: number,    // Max retry attempts (default: 3)
  backoffMs?: number,      // Backoff delay in ms (default: 1000)
}
```

## Error Handling

The system uses custom error types for better error handling:

```typescript
import { MCPError, MCPErrorCode } from './types';

try {
  await host.processUserMessage(sessionId, message);
} catch (error) {
  if (error instanceof MCPError) {
    switch (error.code) {
      case MCPErrorCode.SessionNotFound:
        // Handle missing session
        break;
      case MCPErrorCode.ServerConnectionFailed:
        // Handle connection failure
        break;
      case MCPErrorCode.ToolExecutionFailed:
        // Handle tool execution error
        break;
    }
  }
}
```

## Testing

See `example-usage.ts` for comprehensive examples including:
- Student session example
- Teacher session example
- Admin session example
- Multiple concurrent sessions
- Error handling
- Session persistence

Run examples:
```bash
# Set your API key
export OPENAI_API_KEY=your-key-here

# Run examples
npx tsx src/backend/mcp-host/example-usage.ts
```

## Future Enhancements

1. **Database Persistence**: Store sessions and conversation history in database
2. **Authentication Integration**: Integrate with Supabase Auth
3. **Streaming Responses**: Support streaming LLM responses
4. **Advanced Tool Routing**: Cross-server tool calls with permission control
5. **Metrics and Monitoring**: Detailed performance and usage metrics
6. **Rate Limiting**: Implement rate limiting for API calls
7. **Caching**: Cache MCP server responses where appropriate
8. **WebSocket Support**: Real-time bidirectional communication

## Dependencies

Required packages (to be installed):
- `uuid`: Session ID generation
- `@modelcontextprotocol/sdk`: MCP protocol implementation

For MCP servers:
- `@modelcontextprotocol/sdk`: MCP SDK for TypeScript

## License

Part of the ESL Learning Platform project.
