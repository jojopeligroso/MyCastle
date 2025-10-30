# 7. Agents and Orchestration

> **Document status:** Living specification. Defines Host orchestration patterns and agent coordination.

---

## 7.1 Supervisor Agent (Host Service)

### Overview

The **Host Service** acts as the **Supervisor Agent** that orchestrates all interactions between users, MCP servers, and the LLM. It is the central intelligence that:

- Routes user requests to appropriate MCP servers
- Enforces authorization and security policies
- Aggregates context from multiple sources
- Coordinates multi-step workflows
- Manages conversation state and history
- Provides observability and logging

### Responsibilities

```typescript
interface HostService {
  // Session Management
  createSession(userId: string, role: string): Session;
  terminateSession(sessionId: string): void;

  // Authorization
  verifyJWT(token: string): UserClaims;
  checkAuthorization(user: UserClaims, action: string): boolean;

  // MCP Orchestration
  activateMCP(role: string, userContext: UserContext): MCPClient;
  routeToolCall(toolName: string, args: any, session: Session): ToolResult;
  aggregateResources(session: Session): Resource[];

  // LLM Coordination
  buildCompositePrompt(userQuery: string, session: Session): LLMPrompt;
  streamLLMResponse(prompt: LLMPrompt): AsyncIterator<string>;
  handleFunctionCalls(calls: FunctionCall[], session: Session): FunctionResult[];

  // Workflow Management
  executePipeline(steps: WorkflowStep[], session: Session): WorkflowResult;
  enforcePolicy(action: Action, context: Context): PolicyDecision;

  // Observability
  logAction(action: Action, result: Result): void;
  emitMetrics(metric: Metric): void;
}
```

---

## 7.2 Orchestration Patterns

### 7.2.1 Simple Query Pattern

**Scenario**: User asks a question that requires only one MCP server.

```
User: "How many students do we have?"

Host:
1. Verify JWT → role: admin
2. Activate Admin MCP (if not already active)
3. Fetch resource: admin://user_roster
4. Build prompt: system + user_roster + user query
5. Call LLM with prompt
6. LLM responds: "You have 145 students enrolled."
7. Return response to user

No tool calls needed.
```

---

### 7.2.2 Single Tool Pattern

**Scenario**: User requests an action that requires one tool call.

```
User: "Add a teacher named Alice, email alice@school.com"

Host:
1. Verify JWT → role: admin
2. Activate Admin MCP
3. Get available tools from Admin MCP
4. Build prompt with tools
5. Call LLM
6. LLM responds with function call:
   {
     "name": "add_user",
     "arguments": {
       "email": "alice@school.com",
       "name": "Alice",
       "role": "teacher"
     }
   }
7. Host routes to Admin MCP: tools/call(add_user, {...})
8. Admin MCP executes, returns: "User created, ID: user-789"
9. Host sends result back to LLM
10. LLM formats final response: "I've added Alice as a teacher..."
11. Return to user
```

---

### 7.2.3 Multi-Tool Sequential Pattern

**Scenario**: User request requires multiple steps in sequence.

```
User: "Create a class called Spanish 101 for teacher Alice"

Host:
1. Verify JWT → role: admin
2. Activate Admin MCP
3. Build prompt, call LLM

LLM → Tool Call 1: search for teacher "Alice"
  Host → Admin MCP: (internal search or tool call)
  Admin MCP → Returns: teacher_id = "user-789"
  Host → LLM (with result)

LLM → Tool Call 2: create_class(name="Spanish 101", teacher_id="user-789", ...)
  Host → Admin MCP: tools/call(create_class, {...})
  Admin MCP → Returns: "Class created, ID: class-456"
  Host → LLM (with result)

LLM → Final response: "I've created Spanish 101 and assigned it to Alice."
```

**Key Point**: Host handles one tool call at a time, waits for result, sends back to LLM, repeats.

---

### 7.2.4 Multi-MCP Fan-Out Pattern

**Scenario**: User request requires data/actions from multiple MCP servers.

```
User (Admin): "Process payment for student Bob in Math 101"

Host:
1. Verify JWT → role: admin
2. Activate Admin MCP and Payments MCP

LLM → Tool Call 1: get_student_info(name="Bob", class="Math 101")
  Host → Admin MCP: tools/call(get_student_info, {...})
  Admin MCP → Returns: {student_id: "user-999", amount_due: 500}
  Host → LLM

LLM → Tool Call 2: process_payment(student_id="user-999", amount=500)
  Host routes to → Payments MCP: tools/call(process_payment, {...})
  Payments MCP → Calls Stripe API → Returns: {receipt_id: "rcpt-123"}
  Host → LLM

LLM → Tool Call 3: record_payment(student_id="user-999", receipt="rcpt-123")
  Host → Admin MCP: tools/call(record_payment, {...})
  Admin MCP → Updates database → Returns: "Payment recorded"
  Host → LLM

LLM → Final response: "Payment of $500 processed for Bob. Receipt #rcpt-123."
```

**Key Point**: Host acts as mediator. MCPs never talk directly to each other.

---

### 7.2.5 Cross-Role Query Pattern

**Scenario**: User needs data that spans role boundaries (with permission).

```
User (Student): "What's my grade in Math 101?"

Host:
1. Verify JWT → role: student, user_id: "user-999"
2. Activate Student MCP

Student MCP does not have grade data directly.

LLM → Tool Call: get_my_grade(class="Math 101")
  Host recognizes this needs Teacher MCP data
  Host checks policy: "Student can read their own grades" → Allowed

  Host → Activates Teacher MCP with context:
    {requesting_user: "user-999", query_scope: "own_grades_only"}

  Host → Teacher MCP: tools/call(get_student_grade, {
    student_id: "user-999",
    class: "Math 101"
  })

  Teacher MCP → Verifies student_id matches requesting user
  Teacher MCP → Returns: {grade: "A-", percentage: 88}

  Host → LLM

LLM → "Your current grade in Math 101 is A- (88%)."
```

**Key Point**: Host enforces policy. Teacher MCP double-checks authorization.

---

## 7.3 Workflow Orchestration

### 7.3.1 Workflow Definition

Complex operations can be defined as workflows with explicit steps:

```typescript
interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  rollback?: RollbackStep[];
}

interface WorkflowStep {
  name: string;
  mcpServer: string;
  tool: string;
  arguments: (context: WorkflowContext) => any;
  onSuccess?: (result: any, context: WorkflowContext) => void;
  onFailure?: (error: any, context: WorkflowContext) => void;
}
```

### 7.3.2 Example: User Onboarding Workflow

```typescript
const onboardingWorkflow: Workflow = {
  id: "user_onboarding",
  name: "Complete User Onboarding",
  steps: [
    {
      name: "Create user account",
      mcpServer: "admin",
      tool: "add_user",
      arguments: (ctx) => ({
        email: ctx.email,
        name: ctx.name,
        role: ctx.role
      }),
      onSuccess: (result, ctx) => {
        ctx.userId = result.userId;
      }
    },
    {
      name: "Enroll in initial class",
      mcpServer: "admin",
      tool: "enroll_student",
      arguments: (ctx) => ({
        student_id: ctx.userId,
        class_id: ctx.initialClassId
      })
    },
    {
      name: "Send welcome email",
      mcpServer: "admin",
      tool: "send_notification",
      arguments: (ctx) => ({
        user_id: ctx.userId,
        template: "welcome_email"
      })
    }
  ],
  rollback: [
    {
      name: "Delete user if enrollment fails",
      condition: (ctx) => ctx.currentStep >= 1 && ctx.failed,
      mcpServer: "admin",
      tool: "delete_user",
      arguments: (ctx) => ({user_id: ctx.userId, confirm: true})
    }
  ]
};
```

**Usage**:
```typescript
const result = await host.executeWorkflow(onboardingWorkflow, {
  email: "student@school.com",
  name: "New Student",
  role: "student",
  initialClassId: "class-123"
});
```

---

## 7.4 Policy Enforcement

### 7.4.1 Policy Engine

The Host implements a policy engine to enforce rules:

```typescript
interface Policy {
  id: string;
  description: string;
  condition: (context: PolicyContext) => boolean;
  action: "allow" | "deny" | "require_confirmation";
  message?: string;
}

const policies: Policy[] = [
  {
    id: "no_cross_tenant_access",
    description: "Users cannot access data from other tenants",
    condition: (ctx) => ctx.requestedTenantId !== ctx.userTenantId,
    action: "deny",
    message: "Access denied: Cross-tenant access not allowed"
  },
  {
    id: "student_own_data_only",
    description: "Students can only access their own data",
    condition: (ctx) =>
      ctx.role === "student" && ctx.requestedUserId !== ctx.userId,
    action: "deny",
    message: "Access denied: You can only access your own data"
  },
  {
    id: "confirm_user_deletion",
    description: "User deletion requires explicit confirmation",
    condition: (ctx) => ctx.tool === "delete_user" && !ctx.confirmed,
    action: "require_confirmation",
    message: "This action requires confirmation"
  }
];
```

### 7.4.2 Policy Evaluation

```typescript
function enforcePolicy(action: Action, context: Context): PolicyDecision {
  for (const policy of policies) {
    if (policy.condition(context)) {
      if (policy.action === "deny") {
        return {
          allowed: false,
          reason: policy.message
        };
      } else if (policy.action === "require_confirmation") {
        return {
          allowed: false,
          requiresConfirmation: true,
          reason: policy.message
        };
      }
    }
  }
  return {allowed: true};
}
```

---

## 7.5 Conversation State Management

### 7.5.1 Session State

```typescript
interface Session {
  id: string;
  userId: string;
  role: string;
  tenantId: string;
  createdAt: Date;
  lastActivity: Date;

  // MCP connections
  mcpClients: Map<string, MCPClient>;

  // Conversation
  messages: Message[];
  context: Map<string, any>; // Persistent context across messages

  // Metadata
  metadata: {
    llmModel: string;
    totalTokens: number;
    toolCallsCount: number;
  };
}
```

### 7.5.2 Context Persistence

**Short-term (in-memory)**:
- Last N messages (e.g., 20) kept in session
- Recent tool results cached
- User preferences for session

**Long-term (database)**:
- Important conversations saved to `conversations` table
- User can retrieve past conversations
- Used for training/improvement (with consent)

---

## 7.6 Error Handling and Recovery

### 7.6.1 Retry Strategy

```typescript
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  }
): Promise<T> {
  for (let attempt = 0; attempt < options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === options.maxRetries - 1) throw error;

      const delay = options.exponentialBackoff
        ? options.retryDelay * Math.pow(2, attempt)
        : options.retryDelay;

      await sleep(delay);
    }
  }
}
```

### 7.6.2 Graceful Degradation

If a critical service fails:

1. **LLM API Down**:
   - Return cached response if similar query exists
   - Show user-friendly error: "AI assistant temporarily unavailable"
   - Queue query for later processing (optional)

2. **MCP Server Down**:
   - Log error with full context
   - Inform user: "Unable to access [functionality] right now"
   - Attempt to restart MCP server (if stdio)
   - Fallback to direct database query if possible (bypass MCP)

3. **Database Down**:
   - Critical failure, no recovery
   - Return error page with status monitoring link
   - Alert operations team immediately

---

## 7.7 Logging and Observability

### 7.7.1 Structured Logging

```typescript
interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  component: "host" | "mcp" | "llm" | "database";
  event: string;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
  data: any;
  duration_ms?: number;
}

// Example
logger.info({
  component: "host",
  event: "tool_call_completed",
  userId: session.userId,
  sessionId: session.id,
  tenantId: session.tenantId,
  data: {
    mcpServer: "admin",
    toolName: "add_user",
    success: true
  },
  duration_ms: 245
});
```

### 7.7.2 Metrics

Key metrics to track:

- **Performance**:
  - Average response time (user query → final response)
  - LLM API latency
  - MCP tool call latency
  - Database query time

- **Usage**:
  - Active sessions count
  - Messages per session
  - Tool calls per session
  - LLM tokens consumed

- **Reliability**:
  - Error rate by component
  - Retry success rate
  - MCP connection failures

- **Business**:
  - Daily/monthly active users
  - Feature adoption (which tools are used most)
  - User satisfaction (if feedback collected)

### 7.7.3 Distributed Tracing

For complex multi-step operations:

```typescript
const trace = tracer.startTrace("user_request");

const mcpSpan = trace.startSpan("mcp_tool_call");
// ... execute tool call
mcpSpan.end();

const llmSpan = trace.startSpan("llm_request");
// ... call LLM
llmSpan.end();

trace.end();
```

---

## 7.8 AI-Assisted Development (Meta-Agent Pattern)

### 7.8.1 Development Workflow with AI

The original spec described using AI (Claude) to assist in building the platform itself. This meta-pattern includes:

**CloudMD Context File**:
- High-level project specification
- Data schema summaries
- Coding conventions and patterns
- Example implementations

**ChannelMD Coordination**:
- Simulated communication channel between AI agents
- Each AI agent posts progress updates
- Human project manager oversees and resolves conflicts

**Task Decomposition**:
- Large features broken into parallel subtasks
- Each subtask assigned to an AI instance
- Human reviews and integrates outputs

### 7.8.2 Example: Parallel Development

```markdown
# channel.md

[Human PM]: Starting Sprint 1. Tasks:
- Task A: Implement Admin MCP user tools (Agent-1)
- Task B: Implement Admin MCP class tools (Agent-2)
- Task C: Build frontend user management UI (Agent-3)

[Agent-1]: Starting Task A. Will implement add_user, modify_user, delete_user.
ETA: 30 minutes.

[Agent-2]: Starting Task B. Will implement create_class, modify_class, enroll_student.
ETA: 40 minutes.

[Agent-3]: Starting Task C. Depends on Agent-1 for API contracts. Will wait for
interface definition then proceed with UI components.

[Agent-1]: Completed add_user, modify_user. API contract:
POST /api/admin/users (create)
PATCH /api/admin/users/:id (update)
DELETE /api/admin/users/:id (delete)

[Agent-3]: Acknowledged. Building UI components now.

[Agent-1]: Task A complete. All tests passing. PR ready for review.

[Agent-2]: Task B complete. PR ready.

[Agent-3]: Task C complete. UI components built and styled.

[Human PM]: Reviewing PRs. Agent-1 approved and merged. Agent-2 has one issue
(missing tenant_id validation). Please fix.

[Agent-2]: Fixed tenant_id validation. Re-pushed.

[Human PM]: Approved. All tasks complete. Sprint 1 done.
```

This pattern maximizes development velocity by parallelizing independent work while maintaining coordination.

---

## 7.9 Future Agent Enhancements

### Planned Capabilities

1. **Autonomous Error Recovery**: AI agents that detect and fix runtime errors
2. **Self-Optimization**: Agents that analyze performance logs and suggest optimizations
3. **Intelligent Routing**: ML model to predict which MCP servers are needed for a query
4. **Proactive Assistance**: Agents that anticipate user needs based on patterns
5. **Multi-Modal Support**: Voice, image inputs for richer interactions

---

*Next section:*
- *Section 8: Complete database schema with Drizzle definitions*
