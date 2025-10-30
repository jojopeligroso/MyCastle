# 3. Model Context Protocol (MCP)

> **Document status:** Living specification. Defines MCP implementation patterns for the platform.

---

## 3.1 MCP Overview and Purpose

### What is MCP?

The **Model Context Protocol (MCP)** is an open standard that enables AI models (the **Host**) to securely connect with external data sources and tools (the **Servers**). MCP provides a structured way for:

- **Providing Context**: Servers expose **resources** (read-only data) that give the AI model relevant information
- **Enabling Actions**: Servers expose **tools** (callable functions) that the AI model can invoke to perform actions
- **Guiding Behavior**: Servers provide **prompts** (templates) that shape how the AI model behaves for specific use cases

### Why MCP for This Platform?

**Benefits:**
1. **Separation of Concerns**: Each MCP server handles a specific domain (admin, teacher, student), keeping code modular and maintainable
2. **Security Boundaries**: MCP enforces isolation between domains—student data cannot leak to teacher context and vice versa
3. **Standardized Communication**: JSON-RPC 2.0 messaging provides clear contracts between Host and servers
4. **Extensibility**: New capabilities can be added by creating new MCP servers without changing the Host architecture
5. **Testability**: MCP servers can be tested independently using inspection tools like Archon
6. **LLM-Agnostic**: The same MCP servers work with different LLM providers (OpenAI, Anthropic, local models)

### Platform-Specific Implementation

In our platform:
- **Host**: The Next.js/Node.js backend service that orchestrates everything
- **Servers**: Admin MCP (MVP), plus future Identity MCP, Payments MCP, Teacher MCP, Student MCP
- **Communication**: JSON-RPC 2.0 over stdio (local dev) or HTTPS (production)
- **Security**: JWT-based authentication, host-mediated inter-MCP communication, audit logging

---

## 3.2 MCP Architecture and Components

### MCP Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                            HOST                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  MCP CLIENT 1                                          │    │
│  │  ├─ Connected to: Admin MCP                           │    │
│  │  ├─ Transport: stdio (dev) / HTTPS (prod)             │    │
│  │  ├─ Capabilities: [list of admin tools/resources]     │    │
│  │  └─ State: Connected                                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  MCP CLIENT 2 (Future)                                 │    │
│  │  ├─ Connected to: Identity MCP                         │    │
│  │  ├─ Transport: HTTPS                                   │    │
│  │  └─ State: Planned                                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  LLM COORDINATOR                                        │    │
│  │  ├─ Aggregates context from MCP clients                │    │
│  │  ├─ Constructs composite prompts                       │    │
│  │  ├─ Parses LLM function calls                          │    │
│  │  └─ Routes tool invocations to MCP clients             │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────┬───────────────────┬───────────────────────────┘
                   │                   │
         ┌─────────▼──────┐  ┌─────────▼──────┐
         │   Admin MCP    │  │  Identity MCP  │
         │   (MVP)        │  │  (Future)      │
         │                │  │                │
         │  Resources:    │  │  Resources:    │
         │  - Class list  │  │  - User info   │
         │  - User roster │  │  - Permissions │
         │                │  │                │
         │  Tools:        │  │  Tools:        │
         │  - Add user    │  │  - Verify JWT  │
         │  - Create class│  │  - Manage roles│
         │  - Export data │  │  - Reset pwd   │
         │                │  │                │
         │  Prompts:      │  │  Prompts:      │
         │  - Admin persona│ │  - Auth flows  │
         │                │  │                │
         └────────────────┘  └────────────────┘
```

### MCP Server Structure

Each MCP server is a standalone service that implements the MCP protocol:

```typescript
interface MCPServer {
  // Initialization
  initialize(capabilities: ClientCapabilities): ServerCapabilities;

  // Resource management (read-only data)
  listResources(): Resource[];
  readResource(uri: string): ResourceContent;
  subscribeToResource?(uri: string): void; // Optional

  // Tool management (callable functions)
  listTools(): Tool[];
  callTool(name: string, arguments: any): ToolResult;

  // Prompt management (behavior templates)
  listPrompts(): Prompt[];
  getPrompt(name: string, arguments?: any): PromptMessage[];

  // Lifecycle
  shutdown(): void;
}
```

---

## 3.3 MCP Communication Protocol

### JSON-RPC 2.0 Messaging

All MCP communication uses **JSON-RPC 2.0** format.

#### Request Format
```json
{
  "jsonrpc": "2.0",
  "id": "request-123",
  "method": "tools/call",
  "params": {
    "name": "add_user",
    "arguments": {
      "email": "teacher@school.com",
      "role": "teacher",
      "name": "John Doe"
    }
  }
}
```

#### Success Response
```json
{
  "jsonrpc": "2.0",
  "id": "request-123",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "User created successfully with ID: user-uuid-456"
      }
    ],
    "isError": false
  }
}
```

#### Error Response
```json
{
  "jsonrpc": "2.0",
  "id": "request-123",
  "error": {
    "code": -32602,
    "message": "Invalid params: email already exists",
    "data": {
      "field": "email",
      "value": "teacher@school.com"
    }
  }
}
```

### Standard Methods

#### Resources
- `resources/list` - List all available resources
- `resources/read` - Read a specific resource by URI
- `resources/subscribe` - Subscribe to resource updates (optional)
- `resources/unsubscribe` - Unsubscribe from resource updates (optional)

#### Tools
- `tools/list` - List all available tools
- `tools/call` - Invoke a tool with arguments

#### Prompts
- `prompts/list` - List all available prompts
- `prompts/get` - Get a specific prompt template

#### Lifecycle
- `initialize` - Handshake and capability negotiation
- `notifications/initialized` - Notification that initialization is complete
- `ping` - Health check
- `shutdown` - Graceful shutdown

---

## 3.4 Transport and Authentication

### Transport Options

#### Local Development: stdio
```typescript
// Host spawns MCP server as child process
const mcpServer = spawn('node', ['dist/admin-mcp/server.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL,
    USER_ID: session.userId,
    ROLE: session.role,
    TENANT_ID: session.tenantId
  }
});

// Communication via stdin/stdout
mcpServer.stdin.write(JSON.stringify(request) + '\n');
mcpServer.stdout.on('data', (data) => {
  const response = JSON.parse(data.toString());
  // Handle response
});
```

**Benefits:**
- Simple setup for local development
- No network configuration needed
- Direct process spawning

**Limitations:**
- Not suitable for distributed deployments
- Single machine only

#### Production: HTTPS
```typescript
// Host makes HTTPS requests to MCP server endpoint
const response = await fetch('https://admin-mcp.internal:3001/rpc', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`,
    'X-Tenant-ID': session.tenantId
  },
  body: JSON.stringify(request)
});
```

**Benefits:**
- Scalable across multiple machines
- TLS encryption for security
- Can run MCP servers on separate infrastructure

**Configuration:**
- MCP server runs as HTTP service listening on internal port
- Reverse proxy (nginx/Caddy) handles TLS termination
- Internal network or VPN for security
- mTLS for additional security (optional)

### Authentication Flow

#### Host to MCP Server

1. **User Authentication at Host**
   - User logs in via Supabase Auth
   - Host receives JWT with claims: `sub`, `role`, `tenant_id`

2. **MCP Server Activation**
   - Host extracts user context from JWT
   - Host spawns/connects to appropriate MCP server(s) based on role
   - Host passes user context to MCP server:
     - Via environment variables (stdio)
     - Via HTTP headers (HTTPS)

3. **MCP Server Authorization**
   - MCP server receives user context
   - For HTTPS: MCP server verifies JWT signature using Supabase JWKS
   - MCP server stores user context for duration of connection
   - MCP server enforces authorization on every tool call/resource read

#### Example: Admin MCP Authorization

```typescript
// In Admin MCP server
class AdminMCPServer {
  private userContext: UserContext;

  async initialize(capabilities: ClientCapabilities) {
    // Extract user context from environment or headers
    this.userContext = {
      userId: process.env.USER_ID,
      role: process.env.ROLE,
      tenantId: process.env.TENANT_ID
    };

    // Verify role is 'admin'
    if (this.userContext.role !== 'admin') {
      throw new Error('Unauthorized: Admin role required');
    }

    // Return server capabilities
    return {
      capabilities: {
        resources: { /* ... */ },
        tools: { /* ... */ },
        prompts: { /* ... */ }
      }
    };
  }

  async callTool(name: string, args: any): Promise<ToolResult> {
    // Every tool call re-checks authorization
    this.verifyAuthorization(name, args);

    // Execute tool logic with tenant isolation
    return await this.executeTool(name, args);
  }

  private verifyAuthorization(toolName: string, args: any) {
    // Check if user has permission for this tool
    // Verify tenant_id matches for tenant-scoped operations
    // Throw error if unauthorized
  }
}
```

---

## 3.5 Data Flow Between Host, MCPs, and LLM

### Complete Request Flow

```
┌──────────┐
│  User    │
│  Client  │
└────┬─────┘
     │
     │ 1. User sends message: "Add a new teacher named Alice"
     │
     ▼
┌────────────────────────────────────────────────────────┐
│  HOST                                                  │
│                                                        │
│  2. Verify JWT, extract user context                  │
│     → userId: "admin-123"                             │
│     → role: "admin"                                   │
│     → tenantId: "school-abc"                          │
│                                                        │
│  3. Activate Admin MCP client (if not already)        │
│                                                        │
│  4. Gather context from MCP:                          │
│     ┌─────────────────────────────────────┐          │
│     │ Host → Admin MCP: resources/list     │          │
│     │ Admin MCP → Host: [user_roster,      │          │
│     │                    class_list, ...]  │          │
│     │                                       │          │
│     │ Host → Admin MCP: tools/list         │          │
│     │ Admin MCP → Host: [add_user,         │          │
│     │                    create_class, ...] │          │
│     │                                       │          │
│     │ Host → Admin MCP: prompts/get        │          │
│     │         (name: "admin_persona")      │          │
│     │ Admin MCP → Host: [system message]   │          │
│     └─────────────────────────────────────┘          │
│                                                        │
│  5. Construct composite prompt:                       │
│     ┌─────────────────────────────────────┐          │
│     │ System: [admin persona prompt]      │          │
│     │ Context: [relevant resources]       │          │
│     │ Tools: [tool definitions in         │          │
│     │         OpenAI function format]     │          │
│     │ History: [last 10 messages]         │          │
│     │ User: "Add a new teacher Alice"     │          │
│     └─────────────────────────────────────┘          │
│                                                        │
└────────────┬───────────────────────────────────────────┘
             │
             │ 6. Send composite prompt
             ▼
      ┌──────────────┐
      │   LLM API    │
      │  (OpenAI)    │
      └──────┬───────┘
             │
             │ 7. LLM responds with tool call:
             │    {
             │      "tool_name": "add_user",
             │      "arguments": {
             │        "email": "alice@school.com",
             │        "role": "teacher",
             │        "name": "Alice"
             │      }
             │    }
             ▼
┌────────────────────────────────────────────────────────┐
│  HOST                                                  │
│                                                        │
│  8. Parse LLM tool call                               │
│                                                        │
│  9. Route to Admin MCP:                               │
│     ┌─────────────────────────────────────┐          │
│     │ Host → Admin MCP: tools/call        │          │
│     │   {                                  │          │
│     │     "name": "add_user",              │          │
│     │     "arguments": {                   │          │
│     │       "email": "alice@school.com",   │          │
│     │       "role": "teacher",             │          │
│     │       "name": "Alice"                │          │
│     │     }                                 │          │
│     │   }                                  │          │
│     │                                       │          │
│     │ Admin MCP executes:                  │          │
│     │   - Verify authorization             │          │
│     │   - Check email not exists           │          │
│     │   - Insert into database             │          │
│     │   - Return success                   │          │
│     │                                       │          │
│     │ Admin MCP → Host:                    │          │
│     │   {                                  │          │
│     │     "content": [{                    │          │
│     │       "type": "text",                │          │
│     │       "text": "User Alice created    │          │
│     │                with ID user-456"     │          │
│     │     }],                               │          │
│     │     "isError": false                 │          │
│     │   }                                  │          │
│     └─────────────────────────────────────┘          │
│                                                        │
│  10. Send tool result back to LLM                     │
│                                                        │
└────────────┬───────────────────────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │   LLM API    │
      └──────┬───────┘
             │
             │ 11. LLM generates final response:
             │     "I've successfully added Alice as a
             │      teacher. Her account has been created."
             ▼
┌────────────────────────────────────────────────────────┐
│  HOST                                                  │
│                                                        │
│  12. Store conversation in history                    │
│                                                        │
│  13. Return response to client                        │
│                                                        │
└────────────┬───────────────────────────────────────────┘
             │
             │ 14. Display response to user
             ▼
      ┌──────────┐
      │  User    │
      │  Client  │
      └──────────┘
```

### Multi-Tool Scenarios

When LLM needs to call multiple tools:

```
User: "Add a teacher Alice and enroll her in Math 101"

LLM → Tool Call 1: add_user(...)
Host → Admin MCP → Execute → Return user_id
Host → LLM (with result)

LLM → Tool Call 2: create_enrollment(user_id, class_id)
Host → Admin MCP → Execute → Return success
Host → LLM (with result)

LLM → Final Response: "Done! Alice is now enrolled."
```

### Inter-MCP Scenarios (Host-Mediated)

When operation requires multiple MCP servers:

```
User (Admin): "Process payment for student Bob"

Host activates both Admin MCP and Payments MCP

LLM → Tool Call 1: get_student_info(name="Bob")
Host → Admin MCP → Returns {student_id, amount_due}
Host → LLM (with result)

LLM → Tool Call 2: process_payment(student_id, amount)
Host → Payments MCP → Calls payment gateway → Returns receipt
Host → LLM (with result)

LLM → Tool Call 3: record_payment(student_id, receipt)
Host → Admin MCP → Updates database
Host → LLM (with result)

LLM → Final Response: "Payment processed for Bob. Receipt #12345."
```

**Key Point:** MCP servers never communicate directly. Host always mediates.

---

## 3.6 Resources, Tools, and Prompts

### Resources (Read-Only Data)

Resources provide context to the LLM without requiring a function call.

#### Resource Definition
```typescript
interface Resource {
  uri: string; // Unique identifier (e.g., "admin://user_roster")
  name: string; // Human-readable name
  description?: string; // What this resource contains
  mimeType?: string; // Content type (e.g., "application/json")
}
```

#### Example: Admin MCP Resources
```typescript
{
  uri: "admin://user_roster",
  name: "User Roster",
  description: "List of all users in the system",
  mimeType: "application/json"
}

// When Host reads this resource:
{
  "content": [
    {
      "type": "text",
      "text": JSON.stringify([
        {id: "u1", name: "Alice", role: "teacher"},
        {id: "u2", name: "Bob", role: "student"}
      ])
    }
  ]
}
```

**Use Cases:**
- Current user list for admin context
- Student progress summary for teacher context
- Class schedule for student context

### Tools (Callable Functions)

Tools allow the LLM to perform actions.

#### Tool Definition
```typescript
interface Tool {
  name: string; // Function name (e.g., "add_user")
  description: string; // What this tool does
  inputSchema: JSONSchema; // Arguments schema (JSON Schema format)
}
```

#### Example: Admin MCP Tool
```typescript
{
  name: "add_user",
  description: "Create a new user account with specified role",
  inputSchema: {
    type: "object",
    properties: {
      email: {
        type: "string",
        format: "email",
        description: "User's email address"
      },
      name: {
        type: "string",
        description: "User's full name"
      },
      role: {
        type: "string",
        enum: ["admin", "teacher", "student"],
        description: "User's role in the system"
      }
    },
    required: ["email", "name", "role"]
  }
}
```

**Implementation:**
```typescript
async callTool(name: string, args: any): Promise<ToolResult> {
  if (name === 'add_user') {
    // Validate args against schema
    // Check authorization
    // Execute business logic
    const userId = await db.insert(users).values({
      email: args.email,
      name: args.name,
      role: args.role,
      tenant_id: this.userContext.tenantId
    });

    return {
      content: [{
        type: "text",
        text: `User created with ID: ${userId}`
      }],
      isError: false
    };
  }
}
```

### Prompts (Behavior Templates)

Prompts shape how the LLM behaves for the role.

#### Prompt Definition
```typescript
interface Prompt {
  name: string; // Prompt identifier
  description?: string; // What this prompt is for
  arguments?: Argument[]; // Optional dynamic parameters
}
```

#### Example: Admin Persona Prompt
```typescript
{
  name: "admin_persona",
  description: "System prompt defining admin assistant behavior"
}

// When Host requests this prompt:
{
  messages: [
    {
      role: "system",
      content: {
        type: "text",
        text: `You are an AI administrative assistant for an educational platform.

Your role:
- Help administrators with user management, class operations, and reporting
- Provide clear, concise information
- Use a professional, formal tone
- Always confirm before executing destructive actions (delete, modify)
- When generating reports, format data clearly (use tables/lists)

You have access to tools for:
- User management (add, modify, delete users)
- Class management (create, schedule classes)
- Data export (generate Excel/CSV reports)
- Payment tracking (view invoices, record payments)

Security:
- You can only access data for the current tenant (school)
- Always respect user privacy and data protection rules
- Log all significant actions for audit purposes`
      }
    }
  ]
}
```

**Customization:**
- Different prompts for different scenarios (onboarding, reporting, support)
- Dynamic prompts with arguments (e.g., `generate_lesson` with topic parameter)
- Persona adjustments based on user preferences

---

## 3.7 Error Handling and Resilience

### Error Types

#### MCP Protocol Errors
```typescript
enum MCPErrorCode {
  ParseError = -32700,        // Invalid JSON
  InvalidRequest = -32600,    // Invalid JSON-RPC request
  MethodNotFound = -32601,    // Method doesn't exist
  InvalidParams = -32602,     // Invalid method parameters
  InternalError = -32603,     // Server internal error
  ServerError = -32000,       // Generic server error
}
```

#### Application Errors
```typescript
// Tool execution errors
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "result": {
    "content": [{
      "type": "text",
      "text": "Error: Email already exists"
    }],
    "isError": true // Indicates tool execution failure
  }
}
```

### Retry Logic

**Host implements retry with exponential backoff:**
```typescript
async function callMCPToolWithRetry(
  client: MCPClient,
  toolName: string,
  args: any,
  maxRetries = 3
): Promise<ToolResult> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.callTool(toolName, args);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      // Don't retry on client errors (4xx equivalent)
      if (error.code === MCPErrorCode.InvalidParams) throw error;

      // Exponential backoff for server errors
      await delay(Math.pow(2, attempt) * 1000);
    }
  }
}
```

### Timeout Handling

```typescript
const TOOL_CALL_TIMEOUT = 30000; // 30 seconds

const result = await Promise.race([
  client.callTool(toolName, args),
  timeout(TOOL_CALL_TIMEOUT)
]);
```

### Graceful Degradation

If MCP server is unavailable:
1. Host logs error with context
2. Host returns user-friendly error message
3. LLM receives error context and apologizes gracefully
4. User sees: "I'm sorry, I'm having trouble accessing that information right now. Please try again in a moment."

---

## 3.8 MCP Security Best Practices

### Server Security

1. **Input Validation**: Always validate tool arguments against schema
2. **Authorization Checks**: Verify user permissions on every operation
3. **Tenant Isolation**: Enforce `tenant_id` filtering in all database queries
4. **SQL Injection Prevention**: Use parameterized queries (Drizzle handles this)
5. **Rate Limiting**: Implement per-user/per-tenant rate limits on expensive operations

### Host Security

1. **JWT Verification**: Always verify JWT signature before trusting claims
2. **MCP Client Isolation**: Each user session gets isolated MCP client connections
3. **Audit Logging**: Log all tool calls with user context and results
4. **Secret Management**: Never pass secrets through MCP messages; use environment

### Transport Security

1. **TLS**: Always use TLS for production HTTPS transport
2. **mTLS** (optional): Client certificate verification for extra security
3. **Network Isolation**: MCP servers on internal network, not public internet

---

## 3.9 MCP Inspector (Archon for Testing)

### Purpose

**Archon** is a dev-only tool for inspecting and testing MCP servers.

### Use Cases

1. **Schema Verification**: Check that tools/resources match specification
2. **Manual Testing**: Invoke tools with test data, verify responses
3. **Debugging**: Inspect MCP messages in real-time
4. **Contract Testing**: Ensure MCP server adheres to protocol

### Example Workflow

```bash
# Start Admin MCP in inspection mode
archon inspect ./dist/admin-mcp/server.js

# Archon connects and lists capabilities
> resources/list
[
  {"uri": "admin://user_roster", "name": "User Roster"},
  {"uri": "admin://class_list", "name": "Class List"}
]

> tools/list
[
  {"name": "add_user", "description": "Create a new user"},
  {"name": "create_class", "description": "Create a new class"}
]

# Invoke a tool
> tools/call add_user {"email": "test@school.com", "name": "Test User", "role": "teacher"}
{
  "content": [{"type": "text", "text": "User created with ID: user-789"}],
  "isError": false
}

# Read a resource
> resources/read admin://user_roster
{
  "content": [{"type": "text", "text": "[{\"id\": \"user-789\", \"name\": \"Test User\"}]"}]
}
```

### Integration into Development Workflow

- Use Archon during MCP server development to verify behavior
- Write automated tests that call Archon programmatically
- Include Archon inspection in PR review checklist

---

*Next sections:*
- *Section 4: Detailed Admin MCP specification*
- *Section 5-6: Teacher and Student MCP (future)*
- *Section 7: Agent orchestration patterns*
