# 2. System Architecture

> **Document status:** Living specification. Reflects MVP scope (Admin MCP + Host) with future expansion to Teacher and Student MCPs.

---

## 2.1 High-Level Architecture

The platform follows a **client–host–server architecture** based on the Model Context Protocol (MCP). The system consists of:

1. **Client Layer** (User Interface)
2. **Host Layer** (Orchestration and coordination)
3. **Server Layer** (MCP servers providing domain-specific capabilities)
4. **Data Layer** (PostgreSQL/Supabase)
5. **External Services** (LLM API, external integrations)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Student    │  │   Teacher    │  │    Admin     │          │
│  │   Web UI     │  │   Web UI     │  │   Web UI     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    ┌────────▼──────────┐
                    │                   │
┌───────────────────┤   HOST SERVICE    │──────────────────────────┐
│                   │  (Next.js/Node)   │                          │
│                   │                   │                          │
│  ┌────────────────┴───────────────────┴─────────────────┐       │
│  │  • Session Management                                 │       │
│  │  • Authentication & Authorization (Supabase Auth)     │       │
│  │  • MCP Client Connections                             │       │
│  │  • Context Aggregation                                │       │
│  │  • LLM Coordination                                   │       │
│  │  • Conversation History                               │       │
│  │  • Policy Enforcement                                 │       │
│  └───────────────────────────────────────────────────────┘       │
│                             │                                     │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼─────┐         ┌─────▼──────┐      ┌──────▼──────┐
   │ Identity │         │   Admin    │      │  Payments   │
   │   MCP    │         │    MCP     │      │     MCP     │
   │ (Future) │         │  (MVP)     │      │  (Future)   │
   └──────────┘         └────────────┘      └─────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │                    │
                    │  DATA LAYER        │
                    │  (Supabase/        │
                    │   PostgreSQL)      │
                    │                    │
                    │  • Users & Roles   │
                    │  • Classes         │
                    │  • Schedules       │
                    │  • Attendance      │
                    │  • Payments        │
                    │  • Audit Logs      │
                    │                    │
                    └────────────────────┘

  ┌─────────────┐
  │  LLM API    │ ◄─── Called by Host
  │  (OpenAI)   │
  └─────────────┘

  ┌─────────────┐
  │  External   │ ◄─── Called by MCP servers
  │  Services   │      (Moodle, Payment Gateway, etc.)
  └─────────────┘
```

**Key Architectural Principles:**
- **Separation of Concerns**: Each MCP server handles a specific domain
- **Host-Mediated Communication**: All inter-MCP communication goes through the Host
- **Security Boundaries**: Each MCP server enforces its own authorization checks
- **Context Isolation**: MCP servers cannot directly access each other's data
- **Model-Agnostic**: LLM can be swapped without changing MCP contracts

---

## 2.2 Frontend (Next.js / React)

### Technology Stack
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **State Management**: React Context API / Zustand (as needed)
- **Type Safety**: TypeScript with strict mode

### Architecture
The frontend is a **web-first** application with role-specific interfaces:

#### 2.2.1 Student Interface
- **Chat Interface**: Real-time conversational AI tutor
- **Practice Exercises**: Generated quizzes and problems
- **Progress Dashboard**: Visual representation of learning progress
- **Material Access**: Course content, lessons, assignments

#### 2.2.2 Teacher Interface
- **Teaching Assistant Chat**: AI-powered content generation and analysis
- **Class Management**: Roster, attendance, scheduling
- **Assessment Tools**: Quiz generation, grading, performance analytics
- **Content Creation**: Lesson plans, worksheets, study materials

#### 2.2.3 Admin Interface
- **Admin Console**: System-wide operations and analytics
- **User Management**: Onboarding, role assignment, account management
- **Reporting Dashboard**: Usage statistics, performance metrics, financial reports
- **Content Management**: Course catalog, resource library
- **Export Tools**: Generate Excel/CSV reports from templates

### Key Features
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 AA compliance
- **Real-time Updates**: WebSocket/SSE for streaming AI responses
- **Authentication**: Supabase Auth integration with role-based routing
- **Error Handling**: Graceful degradation and user-friendly error messages

---

## 2.3 Backend (Node.js API Routes)

### Host Service Architecture

The Host service is the **central orchestration layer** implemented as a Next.js application with API routes.

#### 2.3.1 Core Responsibilities

**Session Management**
- Create and maintain AI chat sessions for authenticated users
- Store conversation history (in-memory or persisted to Supabase)
- Manage session timeouts and cleanup
- Track active MCP connections per session

**Authentication & Authorization**
- Verify Supabase Auth JWT tokens (JWKS validation)
- Extract user claims: `sub` (user ID), `role`, `tenant_id`
- Enforce role-based access to MCP servers
- Ensure students can only access Student MCP, teachers → Teacher MCP, etc.

**MCP Client Management**
- Spawn/connect to MCP servers based on user role
- Maintain 1:1 client connections to each MCP server
- Handle MCP initialization and capability negotiation
- Route tool calls and resource requests to appropriate servers
- Implement retry logic and error handling for MCP communication

**Context Aggregation**
- Collect resources from active MCP servers
- Build composite prompts combining:
  - User query
  - Role-specific system prompts (from MCP servers)
  - Relevant resources (student profile, class data, etc.)
  - Available tools (function signatures for LLM)
  - Conversation history

**LLM Coordination**
- Send composite prompts to LLM API (OpenAI)
- Handle streaming responses (SSE to frontend)
- Parse LLM tool calls (function calling)
- Route tool invocations to MCP servers via JSON-RPC
- Aggregate tool results and send back to LLM
- Return final responses to client

**Policy Enforcement**
- Inter-MCP communication rules (host-mediated fan-out/fan-in)
- Rate limiting and quota management
- Content filtering and moderation (if applicable)
- Audit logging of all actions

#### 2.3.2 API Routes

```
/api/auth
  POST /login         - Authenticate user (Supabase Auth)
  POST /logout        - End session
  GET  /session       - Verify current session

/api/chat
  POST /start         - Initialize chat session for role
  POST /message       - Send user message, get AI response
  GET  /history       - Retrieve conversation history
  DELETE /session     - End chat session

/api/mcp
  POST /tool-call     - Direct tool invocation (for testing)
  GET  /capabilities  - List available tools/resources for role
  GET  /status        - Health check for MCP connections
```

#### 2.3.3 MCP Client Implementation

**Transport Layer**
- **Local Development**: `stdio` transport (spawn child processes)
- **Production (VPS)**: HTTPS transport with TLS
- **Message Format**: JSON-RPC 2.0

**Connection Management**
```typescript
interface MCPClientConfig {
  serverType: 'admin' | 'teacher' | 'student' | 'identity' | 'payments';
  transport: 'stdio' | 'https';
  endpoint?: string; // for HTTPS
  command?: string; // for stdio
  env?: Record<string, string>;
}

class MCPClient {
  async connect(config: MCPClientConfig): Promise<void>;
  async disconnect(): Promise<void>;
  async listResources(): Promise<Resource[]>;
  async readResource(uri: string): Promise<ResourceContent>;
  async listTools(): Promise<Tool[]>;
  async callTool(name: string, args: any): Promise<ToolResult>;
  async listPrompts(): Promise<Prompt[]>;
  async getPrompt(name: string, args?: any): Promise<PromptMessage[]>;
}
```

---

## 2.4 Database Layer (Supabase / PostgreSQL)

### Database Selection
- **Primary**: Supabase (managed PostgreSQL with added services)
- **Compatibility**: Designed to work with vanilla PostgreSQL via `DATABASE_URL` switch
- **ORM**: Drizzle ORM for type-safe queries and migrations

### Supabase Features Utilized
- **Authentication**: Built-in auth with JWT issuance
- **Row-Level Security (RLS)**: Per-row access control based on user roles and `tenant_id`
- **Real-time Subscriptions**: Optional for live updates
- **Object Storage**: For file uploads (student work, exports, backups)
- **Edge Functions**: Potential for complex operations (report generation, etc.)

### Database Architecture

#### 2.4.1 Schema Organization
```
packages/platform-db/
├── drizzle/
│   ├── migrations/      # Versioned SQL migrations
│   └── seed/            # Seed data (roles, permissions, test data)
├── src/
│   ├── schema/          # Drizzle schema definitions
│   │   ├── users.ts
│   │   ├── classes.ts
│   │   ├── schedules.ts
│   │   ├── attendance.ts
│   │   ├── payments.ts
│   │   └── audit.ts
│   ├── queries/         # Reusable query functions
│   └── views/           # SQL views for reports/exports
└── drizzle.config.ts
```

#### 2.4.2 Multi-tenancy Design
- **Pattern**: Single database, `tenant_id` column on all tenant-scoped tables
- **Rationale**: Start single-tenant (one school per deploy), design for easy multi-tenant evolution
- **RLS Policies**: Enforce `tenant_id` filtering at database level
- **Future Migration Path**: Can move to schema-per-tenant or database-per-tenant if needed

#### 2.4.3 Key Tables (High-Level)
- `users` - User accounts with roles (admin, teacher, student)
- `tenants` - Tenant/school information (for future multi-tenancy)
- `classes` - Class definitions, schedules, capacities
- `enrollments` - Student-class relationships
- `schedules` - Lesson schedules and bookings
- `attendance` - Attendance records per lesson
- `assignments` - Homework, quizzes, assessments
- `submissions` - Student work submissions
- `grades` - Assessment results and feedback
- `payments` - Payment records, invoices
- `audit_logs` - All significant actions for compliance
- `conversations` - Chat history (optional persistence)
- `exports` - Generated reports/exports with signed URLs

*Detailed schema is defined in Section 8.*

---

## 2.5 Authentication (Supabase Auth)

### Authentication Flow

#### 2.5.1 User Login
1. User submits credentials to `/api/auth/login`
2. Host forwards to Supabase Auth
3. Supabase validates and issues JWT (access + refresh tokens)
4. JWT contains claims: `sub`, `email`, `role`, `tenant_id` (custom claim)
5. Host returns tokens to client
6. Client stores tokens (httpOnly cookies or localStorage)

#### 2.5.2 Authenticated Requests
1. Client includes JWT in `Authorization: Bearer <token>` header
2. Host verifies JWT signature using Supabase JWKS endpoint
3. Host extracts claims and validates role
4. Host uses claims to enforce authorization (e.g., route to correct MCP)

#### 2.5.3 JWT Claims Structure
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "admin" | "teacher" | "student",
  "tenant_id": "school-uuid",
  "aud": "authenticated",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Authorization Enforcement

**At Host Layer**
- Verify JWT signature and expiration
- Check `role` claim to determine which MCP server(s) to activate
- Pass `sub`, `role`, `tenant_id` to MCP servers for further authorization

**At MCP Layer**
- Each MCP server receives user context from Host
- Implements its own authorization checks (e.g., "Can this teacher access this class?")
- Uses `tenant_id` for multi-tenancy isolation

**At Database Layer**
- RLS policies enforce that:
  - Students can only read their own data
  - Teachers can access data for their classes
  - Admins can access tenant-wide data (but not cross-tenant)

---

## 2.6 Integrations

### 2.6.1 MCP Server Integration

**Current (MVP)**
- **Admin MCP**: First MCP server to build, handles all administrative operations

**Planned (Phase 2)**
- **Identity MCP**: Separate authentication/authorization service
  - Rationale: Distinct secrets, compliance, audit requirements
  - Functions: User CRUD, role management, session management
  - May become JWT issuer/validator (replacing Supabase Auth in future)

- **Payments MCP**: Separate payment processing service
  - Rationale: Distinct secrets, PCI compliance, financial audit needs
  - Functions: Invoice generation, payment processing, financial reporting
  - Integration with payment gateways

- **Teacher MCP**: Teaching workflow automation
  - Rationale: Distinct domain with specialized tools
  - Functions: Lesson planning, content generation, grading, analytics

- **Student MCP**: Learning workflow support
  - Rationale: Distinct domain with personalized tutoring
  - Functions: Study guidance, practice exercises, progress tracking

### 2.6.2 External Service Integration

**Learning Management Systems (LMS)**
- **Moodle**: Potential integration for existing course content
- **Canvas, Blackboard**: Future connectors as needed
- **Pattern**: MCP servers can call external APIs as part of tool execution

**Payment Gateways**
- **Stripe**: For online payment processing
- **PayPal**: Alternative payment method
- **Bank Transfer**: Manual reconciliation support

**Communication Services**
- **Email**: Transactional emails (Supabase Auth, custom notifications)
- **SMS**: Optional for reminders, alerts
- **Push Notifications**: For mobile apps (future)

**Content Services**
- **Knowledge Base APIs**: For student AI to search reference materials
- **Math Solvers**: For equation solving tools
- **Translation APIs**: For multi-language support (future)

### 2.6.3 Integration Patterns

**MCP-Mediated**
- External services are called by MCP server tools
- Host is unaware of external calls (encapsulated in tool logic)
- Example: Admin MCP's `process_payment` tool calls Stripe API

**Direct (where appropriate)**
- Some services (email, storage) may be called directly by Host
- Used for cross-cutting concerns not specific to one MCP

**Security Considerations**
- API keys stored in environment variables, never in code
- Secrets injected per MCP server (not shared globally)
- Audit logging of all external API calls

---

## 2.7 Scalability and Performance

### Horizontal Scaling
- **Host Service**: Stateless design allows multiple instances behind load balancer
- **MCP Servers**: Can run as separate processes/containers, scaled independently
- **Database**: Supabase handles read replicas and connection pooling
- **Session State**: Can be moved to Redis or similar if needed (currently in-memory or DB)

### Performance Considerations
- **Caching**: Frequently accessed resources (course content, user profiles) cached at Host or MCP level
- **LLM Response Streaming**: Use SSE to stream responses to client for better perceived performance
- **Database Optimization**: Proper indexing, query optimization, use of SQL views for complex reports
- **Asset Delivery**: CDN for static assets, Supabase Storage for user-uploaded files

### Monitoring and Observability
- **Logging**: Structured logs (JSON) for all components
- **Metrics**: Track response times, error rates, LLM token usage
- **Tracing**: Distributed tracing for requests spanning Host → MCP → LLM → External APIs
- **Alerting**: Alerts for critical failures (DB down, LLM API errors, MCP server crashes)

---

## 2.8 Development and Testing

### Local Development Setup
1. Clone repository
2. Install dependencies (`npm install` or equivalent)
3. Set up local Supabase instance or use cloud project
4. Run database migrations (`drizzle-kit migrate`)
5. Seed database with test data
6. Start Host service (`npm run dev`)
7. MCP servers run via `stdio` (spawned by Host)
8. Use Archon for MCP inspection and testing

### Testing Strategy
- **Unit Tests**: For MCP server tools, utility functions
- **Integration Tests**: Full workflows (user login → chat → tool call → response)
- **Security Tests**: Attempt cross-role access, verify RLS, test auth bypass attempts
- **Performance Tests**: Load testing for concurrent users, LLM call optimization
- **MCP Contract Tests**: Use Archon or custom harness to verify tool schemas, resource URIs

### CI/CD (Future)
- Automated tests on PR
- Database migration checks
- Type checking and linting
- Build verification
- Deployment to staging/production environments

---

## 2.9 Security Architecture

### Defense in Depth
1. **Transport Security**: TLS for all production communications
2. **Authentication**: JWT verification at Host entry point
3. **Authorization**: Role checks at Host, further checks at MCP layer
4. **Data Security**: RLS at database layer prevents unauthorized data access
5. **Context Isolation**: MCP servers cannot access each other's data directly
6. **Audit Logging**: All sensitive operations logged immutably

### Threat Model Considerations
- **Unauthorized Access**: Mitigated by JWT + RLS + MCP authorization
- **Data Leakage**: Mitigated by context isolation and least-privilege
- **Injection Attacks**: Mitigated by parameterized queries (Drizzle), LLM prompt sanitization
- **Replay Attacks**: Mitigated by JWT expiration and nonce/timestamp checks
- **DoS**: Mitigated by rate limiting, resource quotas

### Secret Management
- **Environment Variables**: Secrets stored in `.env` (local), secure secret store (production)
- **Per-Service Secrets**: Each MCP server has only the secrets it needs
- **Rotation**: Plan for periodic secret rotation (database credentials, API keys)

---

*See also:*
- *Section 3 for detailed MCP protocol implementation*
- *Section 4 for Admin MCP specification*
- *Section 8 for complete database schema*
