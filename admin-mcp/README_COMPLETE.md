# Admin MCP Server - Complete Implementation Guide

> **Version**: 1.0.0 | **Spec Compliance**: Based on `/esl-mcp-spec/spec/01-admin-mcp.md` v2.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [Tools Reference](#tools-reference)
7. [Resources Reference](#resources-reference)
8. [Authentication & Authorization](#authentication--authorization)
9. [Audit Logging](#audit-logging)
10. [Development](#development)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Overview

The **Admin MCP Server** provides comprehensive administrative operations for the ESL Learning Platform via the Model Context Protocol (MCP). It enables AI assistants (like Claude) to perform administrative tasks with proper authentication, authorization, and audit logging.

### Key Features

- ✅ **50+ Administrative Tools** across 12 categories (partial implementation)
- ✅ **JWT Authentication** with JWKS verification
- ✅ **Scope-Based Authorization** for granular permission control
- ✅ **Immutable Audit Trail** for all administrative actions
- ✅ **Row-Level Security (RLS)** via Supabase
- ✅ **STDIO & HTTP Transports** for flexible integration
- ✅ **Type-Safe** with TypeScript strict mode
- ✅ **Input Validation** using Zod schemas

### Architecture Principles

1. **Security First**: JWT verification, scope checking, RLS enforcement
2. **Auditability**: All mutations logged with who/what/when/why
3. **Tenant Isolation**: Multi-tenant architecture with tenant_id scoping
4. **Type Safety**: Full TypeScript with strict mode enabled
5. **Idempotency**: Operations designed to be safely retryable

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Assistant (Claude)                    │
└────────────────────┬────────────────────────────────────────┘
                     │ MCP Protocol (JSON-RPC 2.0)
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  Transport Layer                            │
│  ┌──────────────┐              ┌──────────────┐            │
│  │ STDIO Server │              │ HTTP Server  │            │
│  │ (stdin/out)  │              │ (Express)    │            │
│  └──────┬───────┘              └──────┬───────┘            │
└─────────┼──────────────────────────────┼──────────────────┘
          │                              │
          └──────────────┬───────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Core MCP Server                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Request Router (JSON-RPC 2.0)                        │  │
│  └───┬──────────────────────────────────────────────────┘  │
│      │                                                      │
│  ┌───▼────────┐  ┌─────────────┐  ┌──────────────┐       │
│  │ Tools      │  │ Resources   │  │ Prompts      │       │
│  │ (50+ ops)  │  │ (read-only) │  │ (templates)  │       │
│  └────────────┘  └─────────────┘  └──────────────┘       │
└─────────┬───────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│                  Support Services                           │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐            │
│  │ Auth     │  │ Audit     │  │ Supabase     │            │
│  │ (JWT)    │  │ (Logger)  │  │ (RLS Client) │            │
│  └──────────┘  └───────────┘  └──────────────┘            │
└─────────┬───────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│                  Supabase (PostgreSQL + RLS)                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ Users   │  │ Classes │  │ Atten.  │  │ Audit   │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
admin-mcp/
├── src/
│   ├── index.ts                    # Entry point
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   ├── core/
│   │   ├── server.ts               # MCP protocol implementation
│   │   ├── auth/
│   │   │   ├── jwt-verify.ts       # JWKS-based JWT verification
│   │   │   └── scopes.ts           # Permission scope definitions
│   │   ├── audit/
│   │   │   ├── logger.ts           # Audit trail implementation
│   │   │   └── index.ts            # Audit helpers
│   │   ├── tools/
│   │   │   ├── index.ts            # Tool registry
│   │   │   ├── create-user.ts      # User creation
│   │   │   ├── assign-role.ts      # Role assignment
│   │   │   ├── create-class.ts     # Class creation
│   │   │   ├── record-attendance.ts # Attendance marking
│   │   │   └── ...                 # Additional tools
│   │   └── resources/
│   │       ├── index.ts            # Resource registry
│   │       ├── users-directory.ts  # User roster resource
│   │       └── ...                 # Additional resources
│   ├── adapters/
│   │   ├── stdio/
│   │   │   └── stdio-server.ts     # STDIO transport
│   │   └── http/
│   │       └── http-server.ts      # HTTP transport
│   └── lib/
│       └── supabase.ts             # Supabase client factory
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Installation

### Prerequisites

- **Node.js**: >= 20.0.0
- **npm**: >= 9.0.0
- **Supabase Project**: With authentication enabled
- **Database**: PostgreSQL (via Supabase)

### Install Dependencies

```bash
cd admin-mcp
npm install
```

### Build TypeScript

```bash
npm run build
```

---

## Configuration

### Environment Variables

Create a `.env` file in the `admin-mcp/` directory:

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration (Required)
JWKS_URI=https://your-project.supabase.co/auth/v1/jwks
JWT_AUDIENCE=admin-mcp
JWT_ISSUER=https://your-project.supabase.co/auth/v1

# MCP Configuration
MCP_TRANSPORT=stdio                  # stdio or http
PORT=3000                            # HTTP server port (if using http)
HOST=0.0.0.0                         # HTTP server host (if using http)

# Logging
LOG_LEVEL=info                       # info, debug, warn, error

# Optional: STDIO default auth (for development)
# MCP_AUTH_HEADER=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase Setup

1. **Create a Supabase project** at https://supabase.com
2. **Enable authentication** in Supabase dashboard
3. **Copy credentials**:
   - `SUPABASE_URL`: Project URL from Settings > API
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key from Settings > API (⚠️ Keep secret!)
4. **JWKS URI**: `https://[project-id].supabase.co/auth/v1/jwks`

### Database Schema

Ensure your database has the required tables. See `/esl-mcp-spec/spec/08-database.md` for the complete schema.

**Minimum Required Tables**:
- `tenants` - Organization/school records
- `users` (or `profiles`) - User accounts with roles
- `classes` - Class definitions
- `enrollments` - Student-class relationships
- `class_sessions` - Individual class meetings
- `attendance` - Attendance records
- `audit_logs` - Audit trail

---

## Usage

### Running the Server

#### STDIO Transport (for AI clients)

```bash
# Development
npm run dev:stdio

# Production
npm start
```

The server listens on **stdin** for JSON-RPC 2.0 requests and writes responses to **stdout**.

#### HTTP Transport (for web/API access)

```bash
# Development
MCP_TRANSPORT=http PORT=3000 npm run dev:stdio

# Production
MCP_TRANSPORT=http PORT=3000 npm start
```

The server starts an HTTP server at `http://0.0.0.0:3000` (or configured PORT).

### Integrating with Claude Desktop

Add to Claude Desktop's MCP configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "admin-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/esl-learning-platform/admin-mcp/dist/index.js",
        "stdio"
      ],
      "env": {
        "JWKS_URI": "https://your-project.supabase.co/auth/v1/jwks",
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "JWT_AUDIENCE": "admin-mcp",
        "JWT_ISSUER": "https://your-project.supabase.co/auth/v1",
        "MCP_AUTH_HEADER": "Bearer YOUR_JWT_TOKEN_HERE"
      }
    }
  }
}
```

**Note**: For production, use a proper secret management solution instead of hardcoding tokens.

### Making Requests

#### Via STDIO

Send JSON-RPC 2.0 requests to stdin:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create-user",
    "arguments": {
      "email": "teacher@school.ie",
      "fullName": "Mary Smith",
      "roles": ["teacher"]
    }
  },
  "id": 1,
  "meta": {
    "authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Via HTTP

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create-user",
      "arguments": {
        "email": "teacher@school.ie",
        "fullName": "Mary Smith",
        "roles": ["teacher"]
      }
    },
    "id": 1
  }'
```

---

## Tools Reference

### Core Administrative Tools

#### 1. User Management

##### `create-user`

Create a new user account.

**Scope Required**: `admin.write.user`

**Input**:
```json
{
  "email": "user@example.com",
  "fullName": "Full Name",
  "roles": ["admin" | "teacher" | "student"]
}
```

**Output**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Example**:
```typescript
// Via Claude
"Create a new teacher account for Mary Smith with email teacher@school.ie"

// Claude will call:
{
  "email": "teacher@school.ie",
  "fullName": "Mary Smith",
  "roles": ["teacher"]
}
```

##### `assign-role`

Assign or change user role.

**Scope Required**: `admin.write.role`

**Input**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "role": "admin" | "teacher" | "student"
}
```

**Guardrails**:
- Cannot escalate to admin/super_admin without super admin privileges
- Audit trail with reason

##### `update-user`

Update user profile information.

**Scope Required**: `admin.write.user`

**Input**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "updates": {
    "fullName": "Updated Name",
    "email": "new@example.com"
  }
}
```

#### 2. Class Management

##### `create-class`

Create a new class with schedule.

**Scope Required**: `admin.write.class`

**Input**:
```json
{
  "name": "B1 Morning Group A",
  "level": "B1",
  "capacity": 15,
  "schedule": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "13:00",
      "room": "Room 3"
    }
  ]
}
```

**Output**:
```json
{
  "classId": "class-uuid"
}
```

**Validation**:
- Checks for room conflicts (basic implementation)
- Validates time format (HH:MM)
- dayOfWeek: 0 = Sunday, 6 = Saturday

#### 3. Attendance Management

##### `record-attendance`

Record attendance for multiple students in a class.

**Scope Required**: `admin.write.attendance`

**Input**:
```json
{
  "registerDate": "2025-01-15T09:00:00Z",
  "classId": "class-uuid",
  "entries": [
    {
      "studentId": "student-uuid-1",
      "status": "present",
      "note": "On time"
    },
    {
      "studentId": "student-uuid-2",
      "status": "late",
      "note": "Arrived 15 min late"
    }
  ]
}
```

**Output**:
```json
{
  "saved": 2
}
```

**Validation**:
- Prevents duplicate attendance for same student/date
- Status must be: present, absent, late, excused
- Emits audit entry per student

##### `gen-register-csv`

Generate attendance register CSV for export.

**Scope Required**: `admin.read.attendance`

**Input**:
```json
{
  "classId": "class-uuid",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

---

## Resources Reference

Resources provide read-only contextual data to the AI assistant.

### Available Resources

#### `admin://users-directory`

Complete user directory with roles and status.

**Schema**:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Full Name",
      "role": "admin | teacher | student",
      "status": "active | suspended | inactive",
      "created_at": "ISO8601",
      "last_login": "ISO8601"
    }
  ],
  "total": 42,
  "filters_applied": {}
}
```

**Use Case**: "How many active teachers do we have?"

#### `admin://class-load`

Class capacity and enrollment overview.

**Schema**:
```json
{
  "classes": [
    {
      "id": "uuid",
      "name": "B1 Morning A",
      "level": "B1",
      "capacity": 15,
      "enrolled": 12,
      "utilization": 80.0
    }
  ]
}
```

**Use Case**: "Which classes have available spaces?"

#### `admin://accommodation`

Accommodation host status and capacity.

**Use Case**: "Do we have space for 3 new students?"

---

## Authentication & Authorization

### JWT Token Structure

The server expects a JWT token with the following claims:

```json
{
  "sub": "user-uuid",
  "email": "admin@example.com",
  "role": "admin",
  "tenant_id": "tenant-uuid",
  "scopes": [
    "admin.read.user",
    "admin.write.user",
    "admin.write.class"
  ],
  "aud": "admin-mcp",
  "iss": "https://your-project.supabase.co/auth/v1",
  "exp": 1735689600
}
```

### Required Claims

- `sub`: User ID (string)
- `role`: User role (admin, teacher, student)
- `tenant_id`: Tenant/organization ID
- `scopes`: Array of permission scopes (optional, defaults from role)

### Permission Scopes

#### Scope Hierarchy

- `admin.super` - Full access (bypasses all scope checks)
- `admin.read.*` - Read operations
- `admin.write.*` - Write operations
- `admin.delete.*` - Delete operations

#### Scope Domains

- `admin.*.user` - User management
- `admin.*.class` - Class management
- `admin.*.attendance` - Attendance operations
- `admin.*.role` - Role assignment
- `admin.*.pii` - Personally Identifiable Information access

### Example Scopes by Role

**Admin**:
```json
[
  "admin.read.user",
  "admin.write.user",
  "admin.write.role",
  "admin.read.class",
  "admin.write.class",
  "admin.read.attendance",
  "admin.write.attendance",
  "admin.read.pii"
]
```

**Teacher** (limited admin):
```json
[
  "admin.read.user",
  "admin.read.class",
  "admin.write.attendance"
]
```

### Obtaining a JWT Token

```bash
# Via Supabase Auth
curl -X POST https://your-project.supabase.co/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'
```

Response includes `access_token` which is your JWT.

---

## Audit Logging

All administrative operations are logged to the `audit_logs` table with:

- **Actor**: Who performed the action (user ID)
- **Action**: What was done (e.g., `user.create`, `class.update`)
- **Target**: Resource affected (e.g., `user/uuid`, `class/uuid`)
- **Scope**: Permission scope used
- **Before/After**: State changes (diff hash)
- **Timestamp**: When it occurred
- **Correlation ID**: Groups related operations

### Audit Entry Example

```json
{
  "id": "audit-uuid",
  "actor": "admin-uuid",
  "action": "user.create",
  "target": "user/new-user-uuid",
  "scope": "admin.write.user",
  "diff_hash": "sha256:...",
  "timestamp": "2025-01-15T10:30:00Z",
  "correlation_id": "corr-uuid"
}
```

### Correlation IDs

Operations that consist of multiple steps share a correlation ID:

```
correlation_id: abc123
  ├─ user.create (student-uuid)
  ├─ user.role.assign (student-uuid, role: student)
  └─ enrollment.create (student-uuid, class-uuid)
```

### Querying Audit Logs

```sql
-- Get all actions by a specific admin
SELECT * FROM audit_logs
WHERE actor = 'admin-uuid'
ORDER BY timestamp DESC;

-- Get all changes to a specific user
SELECT * FROM audit_logs
WHERE target LIKE 'user/user-uuid%'
ORDER BY timestamp DESC;

-- Get all actions in a workflow
SELECT * FROM audit_logs
WHERE correlation_id = 'corr-uuid'
ORDER BY timestamp ASC;
```

---

## Development

### Project Structure

```
src/
├── core/                    # Core MCP implementation
│   ├── server.ts            # Protocol handler
│   ├── auth/                # Authentication & authorization
│   ├── audit/               # Audit logging
│   ├── tools/               # Tool implementations
│   └── resources/           # Resource providers
├── adapters/                # Transport adapters
│   ├── stdio/               # STDIO transport
│   └── http/                # HTTP transport
├── lib/                     # Shared libraries
│   └── supabase.ts          # Supabase client
├── types/                   # TypeScript types
└── index.ts                 # Entry point
```

### Adding a New Tool

1. **Create tool file** in `src/core/tools/`:

```typescript
// src/core/tools/my-tool.ts
import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

export const MyToolInputSchema = z.object({
  param1: z.string(),
  param2: z.number(),
});

export const MyToolOutputSchema = z.object({
  result: z.string(),
});

export const myToolMetadata: MCPTool = {
  name: 'my-tool',
  description: 'Description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Parameter 1' },
      param2: { type: 'number', description: 'Parameter 2' },
    },
    required: ['param1', 'param2'],
  },
};

export async function executeMyTool(
  context: AdminContext,
  input: z.infer<typeof MyToolInputSchema>
): Promise<z.infer<typeof MyToolOutputSchema>> {
  // 1. Validate input
  const validated = MyToolInputSchema.parse(input);

  // 2. Check scope
  requireScope(context, SCOPES.MY_SCOPE);

  // 3. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Perform operation
  // ... your logic here ...

  // 5. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'my.action',
    target: `resource/id`,
    scope: SCOPES.MY_SCOPE,
    before: {},
    after: {},
    correlationId: generateCorrelationId(),
  });

  // 6. Return result
  return { result: 'success' };
}
```

2. **Register in `src/core/tools/index.ts`**:

```typescript
export * from './my-tool.js';
import { myToolMetadata } from './my-tool.js';

export const toolRegistry: MCPTool[] = [
  // ... existing tools ...
  myToolMetadata,
];
```

3. **Update server routing** in `src/core/server.ts`:

```typescript
import { executeMyTool } from './tools/my-tool.js';

// In routeRequest method:
case 'my-tool':
  return await executeMyTool(context, request.params.arguments);
```

### TypeScript Configuration

The project uses strict TypeScript:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true
  }
}
```

### Code Style

- **Naming**: camelCase for variables/functions, PascalCase for types/classes
- **Comments**: JSDoc comments for all exported functions
- **Error Handling**: Use typed errors (AuthenticationError, AuthorizationError, ValidationError)
- **Validation**: Zod for all input/output schemas
- **Async**: Use async/await, not callbacks

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run type checking
npm run typecheck
```

### Test Structure

```
tests/
├── unit/
│   ├── auth/
│   │   ├── jwt-verify.test.ts
│   │   └── scopes.test.ts
│   ├── tools/
│   │   ├── create-user.test.ts
│   │   └── assign-role.test.ts
│   └── audit/
│       └── logger.test.ts
└── integration/
    └── workflows.test.ts
```

### Writing a Test

```typescript
import { describe, it, expect } from 'vitest';
import { executeCreateUser } from '../src/core/tools/create-user';

describe('create-user tool', () => {
  it('should create user with valid input', async () => {
    const context = {
      actorId: 'admin-uuid',
      actorRole: 'admin',
      scopes: ['admin.write.user'],
      supabaseToken: 'test-token',
    };

    const result = await executeCreateUser(context, {
      email: 'test@example.com',
      fullName: 'Test User',
      roles: ['student'],
    });

    expect(result.userId).toBeDefined();
  });
});
```

---

## Deployment

### Production Build

```bash
# Build TypeScript
npm run build

# Output in dist/
ls dist/
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY dist/ ./dist/

# Set environment
ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js", "http"]
```

Build and run:

```bash
docker build -t admin-mcp:latest .
docker run -p 3000:3000 --env-file .env admin-mcp:latest
```

### Environment-Specific Configuration

**Development**:
```env
LOG_LEVEL=debug
MCP_TRANSPORT=stdio
```

**Staging**:
```env
LOG_LEVEL=info
MCP_TRANSPORT=http
PORT=3000
```

**Production**:
```env
LOG_LEVEL=warn
MCP_TRANSPORT=http
PORT=3000
HOST=0.0.0.0
```

### Health Checks

```bash
# HTTP transport
curl http://localhost:3000/health

# STDIO transport
echo '{"jsonrpc":"2.0","method":"ping","id":1}' | node dist/index.js stdio
```

---

## Troubleshooting

### Common Issues

#### 1. JWT Verification Fails

**Error**: `"JWT verification failed"`

**Causes**:
- Invalid JWKS_URI
- Token expired
- Wrong audience/issuer
- Missing required claims

**Solution**:
```bash
# Verify JWKS endpoint is accessible
curl https://your-project.supabase.co/auth/v1/jwks

# Check JWT claims
echo "YOUR_TOKEN" | cut -d. -f2 | base64 -d | jq

# Ensure JWT_AUDIENCE and JWT_ISSUER match token
```

#### 2. Supabase Connection Fails

**Error**: `"Failed to connect to Supabase"`

**Causes**:
- Wrong SUPABASE_URL
- Invalid SUPABASE_SERVICE_ROLE_KEY
- Network issues

**Solution**:
```bash
# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/ \
  -H "apikey: YOUR_SERVICE_ROLE_KEY"

# Verify environment variables are set
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### 3. RLS Policies Block Operations

**Error**: `"Permission denied for table users"`

**Causes**:
- Missing RLS policies
- Policies don't grant access to service role
- Wrong tenant_id in context

**Solution**:
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'users';

-- Grant service role bypass (for admin operations)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_bypass" ON users
  USING (true)
  WITH CHECK (true)
  FOR ALL
  TO service_role;
```

#### 4. Audit Logs Not Written

**Error**: Silent failure (no audit entries)

**Causes**:
- Missing audit_logs table
- RLS blocking insert
- Supabase client error

**Solution**:
```sql
-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  scope TEXT NOT NULL,
  diff_hash TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  correlation_id TEXT NOT NULL
);

-- Ensure service role can write
GRANT INSERT ON audit_logs TO service_role;
```

### Debugging

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev:stdio
```

Check stderr for diagnostic messages:

```
[STDIO] 2025-01-15T10:30:00.000Z - Admin MCP Server (STDIO) started
[STDIO] 2025-01-15T10:30:05.123Z - Request received: tools/call (id: 1)
[STDIO] 2025-01-15T10:30:05.125Z - Authenticated as: admin-uuid (admin)
[STDIO] 2025-01-15T10:30:05.234Z - Response sent: success (id: 1)
```

---

## License

ISC License

---

## Support

For issues and questions:

1. Check [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for known limitations
2. Review [Troubleshooting](#troubleshooting) section
3. Check Supabase logs and database
4. Enable debug logging for detailed diagnostics

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-01
**Spec Compliance**: Based on `/esl-mcp-spec/spec/01-admin-mcp.md` v2.0.0
