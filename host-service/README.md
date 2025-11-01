# Host Service - MCP Orchestration

The Host Service orchestrates multiple MCP servers and provides LLM-powered chat interfaces for the ESL Learning Platform.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Host Service                          │
│  (Next.js API Routes + MCP Client Manager)               │
└──────────────────┬────────────────┬──────────────────────┘
                   │                │
          ┌────────▼────────┐  ┌───▼───────────┐
          │   Admin MCP     │  │  Teacher MCP  │  (Future)
          │   (Phase 1)     │  │   (Phase 3)   │
          └─────────────────┘  └───────────────┘
                   │                │
          ┌────────▼────────────────▼───────────────┐
          │         Supabase PostgreSQL              │
          │      (RLS-protected database)            │
          └──────────────────────────────────────────┘
```

## Features

- ✅ **MCP Client Management** - Connects to and manages multiple MCP servers
- ✅ **Context Aggregation** - Fetches relevant resources for LLM context
- ✅ **Tool Routing** - Routes tool calls to appropriate MCP servers
- ✅ **Authorization** - JWT verification and scope-based permissions
- ✅ **LLM Integration** - OpenAI GPT-4 with function calling
- ✅ **Admin Chat Endpoint** - `/api/chat/admin` for administrative operations

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
OPENAI_API_KEY=sk-your-openai-api-key
JWKS_URI=https://your-project.supabase.co/auth/v1/jwks
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_MCP_PATH=../admin-mcp/dist/index.js
```

### 3. Build Admin MCP

```bash
cd ../admin-mcp
npm install
npm run build
cd ../host-service
```

### 4. Run Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

## API Endpoints

### POST /api/chat/admin

Admin chat endpoint with MCP orchestration.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request:**
```json
{
  "message": "Create a new student user named John Doe with email john@example.com",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous message"
    },
    {
      "role": "assistant",
      "content": "Previous response"
    }
  ]
}
```

**Response:**
```json
{
  "message": "I've created a new student user for John Doe with email john@example.com. The user has been sent an invitation email to set up their password.",
  "toolCalls": [
    {
      "name": "create-user",
      "arguments": {
        "email": "john@example.com",
        "name": "John Doe",
        "role": "student"
      }
    }
  ],
  "toolResults": [
    {
      "success": true,
      "data": {
        "user": {
          "id": "user-123",
          "email": "john@example.com",
          "name": "John Doe",
          "role": "student"
        }
      }
    }
  ]
}
```

### GET /api/chat/admin

Get status and available tools.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "status": "ready",
  "user": {
    "id": "admin-123",
    "email": "admin@example.com",
    "role": "admin"
  },
  "mcp": {
    "admin": {
      "connected": true,
      "lastActivity": "2025-11-01T12:00:00.000Z"
    }
  },
  "tools": {
    "available": [
      "create-user",
      "assign-role",
      "create-class",
      "mark-attendance"
    ],
    "count": 14
  }
}
```

## Components

### MCP Client Manager

Manages connections to MCP servers using STDIO transport.

```typescript
import { mcpManager } from '@/lib/mcp-client-manager';

// Get client for a role
const client = await mcpManager.getClient('admin');

// Get connection status
const status = mcpManager.getStatus();

// Health check
const isHealthy = await mcpManager.healthCheck('admin');

// Disconnect
await mcpManager.disconnect('admin');
```

### Context Aggregator

Aggregates resources from MCP servers for LLM context.

```typescript
import { contextAggregator } from '@/lib/context-aggregator';

// Aggregate context for user
const context = await contextAggregator.aggregateContext(client, user, message);

// Build context string for LLM
const contextString = contextAggregator.buildContextString(context);
```

### Tool Router

Routes tool calls to appropriate MCP servers.

```typescript
import { toolRouter } from '@/lib/tool-router';

// Execute a tool
const result = await toolRouter.executeTool(
  { name: 'create-user', arguments: { ... } },
  user
);

// Get available tools for user
const tools = await toolRouter.listAvailableTools(user);

// Get tool schemas for LLM
const schemas = await toolRouter.getAllToolSchemas(user);
```

### Authentication

JWT verification and user context extraction.

```typescript
import { verifyJWT, extractJWT } from '@/lib/auth';

// Extract JWT from header
const token = extractJWT(authHeader);

// Verify and get user
const user = await verifyJWT(token);
```

## Testing

### Test Chat Endpoint

```bash
# Get a JWT token from Supabase Auth first
export JWT="your-jwt-token"

# Test status endpoint
curl http://localhost:3000/api/chat/admin \
  -H "Authorization: Bearer $JWT"

# Test chat endpoint
curl -X POST http://localhost:3000/api/chat/admin \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "List all users"
  }'
```

### Run Unit Tests

```bash
npm test
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4 |
| `JWKS_URI` | Yes | JWKS endpoint for JWT verification |
| `JWT_AUDIENCE` | No | Expected JWT audience (default: admin-mcp) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `ADMIN_MCP_PATH` | No | Path to Admin MCP server (default: ../admin-mcp/dist/index.js) |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |

## Project Structure

```
host-service/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── admin/
│   │   │           └── route.ts   # Admin chat endpoint
│   │   ├── page.tsx               # Home page
│   │   └── layout.tsx             # Root layout
│   └── lib/
│       ├── mcp-client-manager.ts  # MCP connection management
│       ├── context-aggregator.ts  # Context aggregation
│       ├── tool-router.ts         # Tool routing
│       └── auth.ts                # Authentication
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.example
└── README.md
```

## Deployment

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Docker (TODO)

Docker support coming soon.

## Troubleshooting

### "Failed to connect to Admin MCP"

- Ensure Admin MCP is built: `cd ../admin-mcp && npm run build`
- Check `ADMIN_MCP_PATH` environment variable
- Verify Admin MCP environment variables are set

### "JWT verification failed"

- Check `JWKS_URI` is accessible
- Verify JWT token is valid and not expired
- Ensure `JWT_AUDIENCE` matches token claims

### "Tool not found"

- Check tool is registered in `tool-router.ts`
- Verify user has required scopes
- Ensure Admin MCP implements the tool

## Next Steps

1. Add Anthropic Claude integration as alternative to OpenAI
2. Implement Teacher MCP integration (Phase 3)
3. Implement Student MCP integration (Phase 3)
4. Add conversation history persistence
5. Add rate limiting and caching
6. Add monitoring and metrics
7. Docker deployment configuration

## License

ISC

## Author

Eoin Malone with Claude Code
