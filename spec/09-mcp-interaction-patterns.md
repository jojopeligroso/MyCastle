# 9. MCP Interaction Patterns

> **Document Status:** Living specification | **Version:** 1.0.0 | **Last Updated:** 2025-10-31

---

## 9.1 Overview

This document defines **how MCPs communicate** in the ESL Learning Platform. All MCP-to-MCP communication is **host-mediated** to maintain security boundaries, enforce policies, and enable centralized orchestration.

### Core Principle

```
❌ NEVER: MCP A → MCP B (direct communication)
✅ ALWAYS: MCP A → Host → MCP B (host-mediated)
```

---

## 9.2 Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                      USER REQUEST                          │
│            (Student asks: "What's my homework?")           │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   HOST SERVICE         │
        │  (Orchestrator)        │
        │                        │
        │  1. Auth check         │
        │  2. Route to MCP       │
        │  3. Aggregate context  │
        │  4. Call LLM           │
        │  5. Handle tool calls  │
        │  6. Return response    │
        └────────────────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
┌─────────┐    ┌──────────┐   ┌──────────┐
│ Student │    │ Data MCP │   │ Comms    │
│  MCP    │    │(Supabase)│   │   MCP    │
└─────────┘    └──────────┘   └──────────┘
      │              │              │
      └──────────────┴──────────────┘
                     │
                     ▼
            ┌────────────────┐
            │   DATABASE     │
            │  (Supabase)    │
            └────────────────┘
```

---

## 9.3 Interaction Patterns

### Pattern 1: Simple Query (Single MCP)

**Scenario**: User asks "How many students do we have?"

**Flow**:
```typescript
// 1. User request arrives at Host
const request = {
  user: { role: "admin", id: "admin-123", tenant_id: "tenant-1" },
  message: "How many students do we have?"
};

// 2. Host identifies relevant MCP
const activeMCPs = identifyMCPs(request.user.role); // → [Admin MCP]

// 3. Host fetches context from Admin MCP
const resources = await adminMCP.listResources();
const userRoster = await adminMCP.readResource('admin://users');

// 4. Host builds prompt for LLM
const llmPrompt = {
  system: await adminMCP.getPrompt('admin_persona'),
  context: [userRoster],
  tools: await adminMCP.listTools(),
  user: request.message
};

// 5. LLM responds (no tool call needed)
const llmResponse = await llm.chat(llmPrompt);

// 6. Host returns response
return {
  message: "You have 245 students: 120 active, 100 on visa, 25 deferred."
};
```

**Diagram**:
```
User → Host → Admin MCP (context) → Host → LLM → Host → User
```

---

### Pattern 2: Single Tool Call (One MCP)

**Scenario**: Admin says "Add a teacher named Alice Johnson"

**Flow**:
```typescript
// 1-4: Same as Pattern 1 (context gathering, LLM prompt)

// 5. LLM requests tool call
const llmResponse = await llm.chat(llmPrompt);

if (llmResponse.toolCall) {
  // 6. Host routes tool call to correct MCP
  const toolName = llmResponse.toolCall.name; // "create_user"
  const toolArgs = llmResponse.toolCall.arguments;

  // 7. Host validates authorization
  if (!canExecuteTool(request.user, toolName)) {
    throw new Error("Insufficient permissions");
  }

  // 8. Host executes tool via Admin MCP
  const toolResult = await adminMCP.callTool(toolName, toolArgs);

  // 9. Host sends result back to LLM for final response
  const finalResponse = await llm.chat({
    ...llmPrompt,
    toolResult: toolResult
  });

  // 10. Host returns formatted response
  return {
    message: finalResponse.text,
    data: toolResult
  };
}
```

**Diagram**:
```
User → Host → Admin MCP (context) → Host → LLM
                                          ↓
                                    "create_user"
                                          ↓
     Host → Admin MCP (tool) → DB → Admin MCP → Host
                                                  ↓
                                    Host → LLM → Host → User
```

---

### Pattern 3: Multi-MCP Coordination (Sequential)

**Scenario**: Admin says "Process payment for student Bob's invoice"

**Flow**:
```typescript
// This requires: Admin MCP (find Bob) → Payments MCP (process payment)

// 1. Host gathers context from multiple MCPs
const adminContext = await adminMCP.readResource('admin://invoices');
const paymentsContext = await paymentsMCP.readResource('payments://transactions');

// 2. Host builds composite prompt
const llmPrompt = {
  system: await adminMCP.getPrompt('admin_persona'),
  context: [adminContext, paymentsContext],
  tools: [
    ...await adminMCP.listTools(),
    ...await paymentsMCP.listTools()
  ],
  user: "Process payment for student Bob's invoice"
};

// 3. LLM orchestrates multi-step workflow
const llmResponse = await llm.chat(llmPrompt);

// 4. Execute tools in sequence
for (const toolCall of llmResponse.toolCalls) {
  const mcp = routeToolToMCP(toolCall.name);

  // Example sequence:
  // Tool 1: Admin MCP - "find_user" (Bob)
  // Tool 2: Admin MCP - "get_invoice" (Bob's invoice)
  // Tool 3: Payments MCP - "process_payment" (invoice_id, amount)

  const result = await mcp.callTool(toolCall.name, toolCall.arguments);

  // Feed result back to LLM for next step
  const nextStep = await llm.chat({
    ...llmPrompt,
    toolResult: result
  });
}

// 5. Return final result
return { message: "Payment processed successfully", receipt: {...} };
```

**Diagram**:
```
User → Host → Admin MCP + Payments MCP (context) → Host → LLM
                                                      ↓
                                               Tool Call 1: find_user
                                                      ↓
                          Host → Admin MCP → DB → Admin MCP → Host
                                                                ↓
                                                         LLM (next step)
                                                                ↓
                                                    Tool Call 2: get_invoice
                                                                ↓
                          Host → Admin MCP → DB → Admin MCP → Host
                                                                ↓
                                                         LLM (next step)
                                                                ↓
                                                    Tool Call 3: process_payment
                                                                ↓
                      Host → Payments MCP → Stripe → Payments MCP → Host
                                                                      ↓
                                                              LLM (final)
                                                                      ↓
                                                                    User
```

---

### Pattern 4: Fan-Out/Fan-In (Parallel Context Gathering)

**Scenario**: Admin asks "Give me a full system status report"

**Flow**:
```typescript
// Gather data from multiple MCPs in parallel

// 1. Host fans out to all MCPs simultaneously
const [adminData, identityData, paymentsData] = await Promise.all([
  adminMCP.readResource('admin://system_status'),
  identityMCP.readResource('identity://active_sessions'),
  paymentsMCP.readResource('payments://revenue_summary')
]);

// 2. Host aggregates context
const compositeContext = {
  admin: adminData,
  identity: identityData,
  payments: paymentsData
};

// 3. LLM generates report using all context
const llmResponse = await llm.chat({
  system: "Generate comprehensive system status report",
  context: [compositeContext],
  user: "Give me a full system status report"
});

// 4. Return aggregated report
return { message: llmResponse.text, data: compositeContext };
```

**Diagram**:
```
User → Host → ┬→ Admin MCP (parallel)
              ├→ Identity MCP (parallel)
              └→ Payments MCP (parallel)
                     ↓
              Host (aggregates)
                     ↓
                   LLM
                     ↓
                   User
```

---

### Pattern 5: Shared Service Delegation

**Scenario**: Teacher MCP needs to send email (uses Comms MCP)

**Flow**:
```typescript
// Teacher assigns homework → triggers email to students

// 1. User action via Teacher MCP
const homework = await teacherMCP.callTool('assign_homework', {
  class_id: "class-123",
  title: "Present Perfect Exercise",
  due_date: "2025-02-12"
});

// 2. Teacher MCP requests Host to send email
// (Teacher MCP cannot call Comms MCP directly)

// 3. Host delegates to Comms MCP
const students = await dataMCP.callTool('query', {
  table: 'enrolments',
  where: { class_id: "class-123" },
  select: ['student_id', 'student_email']
});

// 4. Host calls Comms MCP
await commsMCP.callTool('send_bulk', {
  template_id: 'homework_assigned',
  recipients: students.map(s => s.student_email),
  variables: {
    homework_title: homework.title,
    due_date: homework.due_date,
    teacher_name: teacher.name
  }
});

// 5. Return confirmation
return { message: "Homework assigned and students notified via email" };
```

**Diagram**:
```
Teacher → Host → Teacher MCP (assign_homework)
                       ↓
              Host (orchestrates email)
                       ↓
              ┌────────┴────────┐
              ↓                 ↓
         Data MCP          Comms MCP
       (get students)     (send email)
              ↓                 ↓
              └────────┬────────┘
                       ↓
                     Host
                       ↓
                    Teacher
```

---

## 9.4 Tool Routing

### How Host Routes Tool Calls to MCPs

```typescript
// Tool registry: maps tool names to MCPs
const toolRegistry = {
  // Admin MCP tools
  "create_user": adminMCP,
  "assign_role": adminMCP,
  "create_class": adminMCP,
  "issue_invoice": adminMCP,

  // Teacher MCP tools
  "create_lesson_plan": teacherMCP,
  "mark_attendance": teacherMCP,
  "assign_homework": teacherMCP,

  // Student MCP tools
  "ask_tutor": studentMCP,
  "submit_homework": studentMCP,
  "view_grades": studentMCP,

  // Payments MCP tools
  "process_payment": paymentsMCP,
  "create_stripe_invoice": paymentsMCP,

  // Comms MCP tools
  "send_email": commsMCP,
  "send_bulk": commsMCP
};

function routeToolToMCP(toolName: string): MCPClient {
  const mcp = toolRegistry[toolName];
  if (!mcp) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return mcp;
}

// Authorization check before routing
function canExecuteTool(user: User, toolName: string): boolean {
  const mcp = routeToolToMCP(toolName);

  // Role-based access control
  if (user.role === "student" && mcp !== studentMCP) {
    return false; // Students can only use Student MCP tools
  }

  if (user.role === "teacher" && ![teacherMCP, studentMCP].includes(mcp)) {
    return false; // Teachers can use Teacher + Student MCP tools
  }

  if (user.role === "admin") {
    return true; // Admins can use all tools
  }

  return false;
}
```

---

## 9.5 Context Aggregation

### How Host Builds Composite Context

```typescript
// Different strategies based on user request

async function aggregateContext(user: User, message: string) {
  const role = user.role;

  // Strategy 1: Role-specific context (most common)
  if (role === "student") {
    return {
      profile: await studentMCP.readResource('student://profile'),
      schedule: await studentMCP.readResource('student://schedule'),
      homework: await studentMCP.readResource('student://homework'),
      progress: await studentMCP.readResource('student://progress')
    };
  }

  if (role === "teacher") {
    return {
      timetable: await teacherMCP.readResource('teacher://my_timetable'),
      classes: await teacherMCP.readResource('teacher://my_classes'),
      lesson_plans: await teacherMCP.readResource('teacher://lesson_plans')
    };
  }

  if (role === "admin") {
    return {
      users: await adminMCP.readResource('admin://users'),
      classes: await adminMCP.readResource('admin://classes'),
      system_status: await adminMCP.readResource('admin://system_status')
    };
  }

  // Strategy 2: Intent-based context (advanced)
  // Parse user message to determine what context is needed
  const intent = parseIntent(message);

  if (intent === "financial_report") {
    return {
      invoices: await adminMCP.readResource('admin://invoices'),
      payments: await adminMCP.readResource('admin://payments'),
      aging: await adminMCP.readResource('admin://aging_report')
    };
  }

  if (intent === "attendance_analysis") {
    return {
      attendance: await adminMCP.readResource('admin://attendance_overview'),
      visa_risk: await adminMCP.readResource('admin://visa_risk')
    };
  }

  // Strategy 3: Adaptive context (smart)
  // Start with minimal context, fetch more if LLM requests it
  return await adaptiveContextFetch(user, message);
}
```

---

## 9.6 Error Handling

### Pattern: Cascading Failures

**Scenario**: Payment MCP is down, but user needs to see invoice

**Handling**:
```typescript
try {
  // Try to get payment status from Payments MCP
  const paymentStatus = await paymentsMCP.readResource('payments://transactions');
} catch (error) {
  // Graceful degradation: use cached data or limited info from Admin MCP
  console.warn('Payments MCP unavailable, using cached data');

  const paymentStatus = {
    status: 'unknown',
    message: 'Payment service temporarily unavailable',
    cached_data: await cache.get('payments:last_known')
  };
}

// Continue with available data
const response = await llm.chat({
  context: [invoiceData, paymentStatus],
  user: message
});
```

### Pattern: Retry with Exponential Backoff

```typescript
async function callMCPWithRetry(
  mcp: MCPClient,
  toolName: string,
  args: any,
  maxRetries: number = 3
) {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await mcp.callTool(toolName, args);
    } catch (error) {
      lastError = error;

      // Only retry on transient errors
      if (isRetryable(error)) {
        const delay = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
        await sleep(delay);
        continue;
      } else {
        throw error; // Non-retryable error, fail immediately
      }
    }
  }

  throw new Error(`MCP call failed after ${maxRetries} attempts: ${lastError.message}`);
}

function isRetryable(error: Error): boolean {
  return [
    'TIMEOUT',
    'CONNECTION_ERROR',
    'SERVICE_UNAVAILABLE'
  ].some(code => error.message.includes(code));
}
```

---

## 9.7 Performance Optimization

### Pattern: Caching Resource Data

```typescript
// Cache frequently-accessed resources
const resourceCache = new Map<string, { data: any, expires: number }>();

async function readResourceWithCache(
  mcp: MCPClient,
  uri: string,
  ttl: number = 60000 // 60 seconds
) {
  const cached = resourceCache.get(uri);

  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  const data = await mcp.readResource(uri);

  resourceCache.set(uri, {
    data,
    expires: Date.now() + ttl
  });

  return data;
}
```

### Pattern: Parallel Tool Execution

```typescript
// Execute independent tools in parallel
async function executeToolsInParallel(toolCalls: ToolCall[]) {
  // Group tools by dependency
  const independent = toolCalls.filter(t => !t.dependsOn);
  const dependent = toolCalls.filter(t => t.dependsOn);

  // Execute independent tools in parallel
  const results = await Promise.all(
    independent.map(toolCall =>
      routeToolToMCP(toolCall.name).callTool(
        toolCall.name,
        toolCall.arguments
      )
    )
  );

  // Execute dependent tools sequentially
  for (const toolCall of dependent) {
    const result = await routeToolToMCP(toolCall.name).callTool(
      toolCall.name,
      toolCall.arguments
    );
    results.push(result);
  }

  return results;
}
```

---

## 9.8 Security Patterns

### Pattern: JWT Propagation

```typescript
// Always pass user JWT through to MCPs for RLS enforcement

async function callMCPTool(
  mcp: MCPClient,
  toolName: string,
  args: any,
  userJWT: string
) {
  // Inject JWT into MCP context
  const result = await mcp.callTool(toolName, args, {
    headers: {
      'Authorization': `Bearer ${userJWT}`
    }
  });

  return result;
}
```

### Pattern: Scope Verification

```typescript
// Verify user has required scope before executing tool

function verifyScopesForTool(user: User, toolName: string): void {
  const requiredScopes = getToolScopes(toolName);

  for (const scope of requiredScopes) {
    if (!user.scopes.includes(scope) && !user.scopes.includes('admin.super')) {
      throw new Error(`Insufficient scope: ${scope} required for ${toolName}`);
    }
  }
}

const toolScopes = {
  "create_user": ["admin.write.user"],
  "assign_role": ["admin.write.user", "admin.write.role"],
  "refund_payment": ["admin.write.refund", "admin.super"],
  "mark_attendance": ["teacher.write.attendance"],
  "submit_homework": ["student.write.homework"]
};
```

---

## 9.9 Monitoring & Observability

### Pattern: Request Tracing

```typescript
// Trace MCP calls through the system

interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  user: string;
  role: string;
  timestamp: number;
}

async function tracedMCPCall(
  mcp: MCPClient,
  toolName: string,
  args: any,
  trace: TraceContext
) {
  const span = {
    ...trace,
    spanId: generateSpanId(),
    parentSpanId: trace.spanId,
    operation: `mcp.${mcp.name}.${toolName}`,
    start: Date.now()
  };

  try {
    const result = await mcp.callTool(toolName, args);

    span.duration = Date.now() - span.start;
    span.status = 'success';

    logTrace(span);
    return result;
  } catch (error) {
    span.duration = Date.now() - span.start;
    span.status = 'error';
    span.error = error.message;

    logTrace(span);
    throw error;
  }
}
```

### Pattern: Audit Logging

```typescript
// Log all MCP tool calls for audit trail

function auditMCPCall(
  user: User,
  mcp: MCPClient,
  toolName: string,
  args: any,
  result: any
) {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    actor: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    action: `mcp.${mcp.name}.${toolName}`,
    resource: {
      type: determineResourceType(toolName),
      id: args.id || args.user_id || args.class_id
    },
    changes: {
      before: null, // Fetch if update
      after: result
    },
    ip_address: user.ip,
    user_agent: user.userAgent
  };

  // Write to audit log (immutable, tamper-evident)
  writeAuditLog(auditEntry);
}
```

---

## 9.10 Best Practices

### ✅ DO

1. **Always mediate through Host** - Never allow direct MCP-to-MCP calls
2. **Validate authorization twice** - Once at Host, once at MCP
3. **Pass JWT context** - Ensure RLS policies are enforced
4. **Cache smartly** - Cache read-only resources with appropriate TTL
5. **Fail gracefully** - Degrade functionality rather than complete failure
6. **Trace all calls** - Maintain observability for debugging
7. **Audit mutations** - Log all write operations immutably
8. **Use parallel execution** - For independent tool calls
9. **Retry transient failures** - With exponential backoff
10. **Monitor performance** - Track MCP response times

### ❌ DON'T

1. **Don't hardcode MCP URLs** - Use service discovery
2. **Don't skip authorization** - Always verify user permissions
3. **Don't cache indefinitely** - Set appropriate TTLs
4. **Don't expose internal errors** - Return user-friendly messages
5. **Don't block on slow MCPs** - Use timeouts and fallbacks
6. **Don't retry forever** - Set max retry limits
7. **Don't log sensitive data** - Redact PII in logs
8. **Don't bypass RLS** - Always pass user context
9. **Don't couple MCPs tightly** - Maintain loose coupling
10. **Don't ignore errors** - Handle and log properly

---

## 9.11 Example: Complete Request Flow

### Scenario: Student Asks AI Tutor for Grammar Help

**Request**: "Can you explain when to use present perfect?"

**Complete Flow**:

```typescript
// 1. Request arrives at Host
const request = {
  user: {
    id: "student-123",
    email: "student@example.com",
    role: "student",
    tenant_id: "tenant-1",
    jwt: "eyJhbG..."
  },
  message: "Can you explain when to use present perfect?"
};

// 2. Host authenticates & authorizes
const user = await verifyJWT(request.jwt);
if (user.role !== 'student') {
  throw new Error('Unauthorized');
}

// 3. Host identifies relevant MCP
const activeMCPs = [studentMCP];

// 4. Host gathers context from Student MCP
const context = {
  profile: await studentMCP.readResource('student://profile'),
  progress: await studentMCP.readResource('student://progress')
};

// Student's current level: B1
const studentLevel = context.profile.enrolment.current_level; // "B1"

// 5. Host lists available tools
const tools = await studentMCP.listTools();
// Tools available: ["ask_tutor", "practice_exercise", "submit_homework", ...]

// 6. Host gets system prompt
const systemPrompt = await studentMCP.getPrompt('student_persona');

// 7. Host builds LLM prompt
const llmPrompt = {
  model: "gpt-4",
  messages: [
    {
      role: "system",
      content: systemPrompt + `\nStudent CEFR level: ${studentLevel}`
    },
    {
      role: "user",
      content: request.message
    }
  ],
  tools: tools // Make tools available to LLM
};

// 8. Host calls LLM
const llmResponse = await openai.chat.completions.create(llmPrompt);

// 9. LLM decides to use "ask_tutor" tool
if (llmResponse.tool_calls) {
  const toolCall = llmResponse.tool_calls[0];
  // {
  //   name: "ask_tutor",
  //   arguments: {
  //     question: "Can you explain when to use present perfect?",
  //     context: "grammar_question"
  //   }
  // }

  // 10. Host validates user can execute tool
  verifyScopesForTool(user, "ask_tutor"); // Requires "student.use.ai_tutor"

  // 11. Host calls Student MCP tool
  const toolResult = await studentMCP.callTool(
    "ask_tutor",
    toolCall.arguments,
    { jwt: request.jwt } // Pass JWT for audit
  );

  // Tool result (from Student MCP):
  // {
  //   answer: "Great question! The present perfect is used when...[B1-adapted explanation]...",
  //   examples: [...],
  //   practice_suggestion: "Try making 3 sentences..."
  // }

  // 12. Host sends tool result back to LLM for final response
  const finalResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      ...llmPrompt.messages,
      {
        role: "assistant",
        content: null,
        tool_calls: [toolCall]
      },
      {
        role: "tool",
        content: JSON.stringify(toolResult),
        tool_call_id: toolCall.id
      }
    ]
  });

  // 13. Host formats response for user
  const response = {
    message: finalResponse.choices[0].message.content,
    // "The present perfect is used when...[explanation]...Would you like to try some practice exercises?"
    data: toolResult
  };

  // 14. Host logs audit entry
  auditMCPCall(user, studentMCP, "ask_tutor", toolCall.arguments, toolResult);

  // 15. Host returns response to frontend
  return response;
}
```

**Trace Log**:
```json
{
  "traceId": "trace-abc123",
  "spans": [
    {
      "spanId": "span-001",
      "operation": "host.handleRequest",
      "duration": 1250,
      "status": "success",
      "user": "student-123"
    },
    {
      "spanId": "span-002",
      "parentSpanId": "span-001",
      "operation": "studentMCP.readResource",
      "resource": "student://profile",
      "duration": 45,
      "status": "success"
    },
    {
      "spanId": "span-003",
      "parentSpanId": "span-001",
      "operation": "openai.chat.completions",
      "duration": 800,
      "status": "success",
      "tokens": 450
    },
    {
      "spanId": "span-004",
      "parentSpanId": "span-001",
      "operation": "studentMCP.ask_tutor",
      "duration": 350,
      "status": "success"
    }
  ]
}
```

**Audit Log**:
```json
{
  "timestamp": "2025-10-31T14:30:22.123Z",
  "actor": {
    "id": "student-123",
    "email": "student@example.com",
    "role": "student"
  },
  "action": "mcp.student.ask_tutor",
  "resource": {
    "type": "ai_tutor_session",
    "question": "present perfect usage"
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "result": "success"
}
```

---

## 9.12 Summary

### Key Takeaways

1. **Host is Central** - All MCP communication flows through the Host service
2. **Security Layered** - Authorization checked at Host AND MCP levels
3. **Context is King** - Aggregating the right context is crucial for LLM performance
4. **Tool Routing** - Host maintains tool registry for correct MCP routing
5. **Graceful Degradation** - System continues with limited functionality if MCP fails
6. **Observability** - Tracing and audit logging are mandatory
7. **Performance Matters** - Cache aggressively, execute in parallel where possible

### MCP Communication Rules

```
✅ Host → MCP (allowed)
✅ MCP → Database (allowed)
✅ MCP → External Service (allowed)
❌ MCP → MCP (forbidden - use Host mediation)
❌ Frontend → MCP (forbidden - use Host)
```

---

**Document Status**: Complete - Implementation Guide
**Next Steps**: Implement Host orchestration logic following these patterns
**See Also**: `spec/02-system-architecture.md`, `spec/07-agents.md`
