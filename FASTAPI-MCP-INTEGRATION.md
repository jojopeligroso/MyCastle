# FastAPI MCP Integration Guide

> **Version:** 1.0.0 | **Status:** ✅ Implemented | **Date:** 2025-11-14

---

## Executive Summary

This document describes the FastAPI integration for MyCastle's Model Context Protocol (MCP) servers. The FastAPI backend provides a Python-based alternative to the Next.js MCP implementation, offering:

- **Python ecosystem benefits**: Access to ML/AI libraries, data processing tools
- **Performance**: Async/await support, efficient request handling
- **Scalability**: Independent deployment and horizontal scaling
- **Interoperability**: REST API compatible with any client

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     MyCastle Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   Next.js UI     │         │  FastAPI Backend │         │
│  │   (Port 3000)    │◄───────►│   (Port 8000)    │         │
│  └──────────────────┘         └──────────────────┘         │
│         │                              │                     │
│         │                              │                     │
│         └──────────────┬───────────────┘                     │
│                        ▼                                     │
│                 ┌─────────────┐                              │
│                 │  Supabase   │                              │
│                 │  Database   │                              │
│                 └─────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

### FastAPI MCP Architecture

```
FastAPI Application
├── MCP Host (Orchestration)
│   ├── Finance MCP (9 tools)
│   │   ├── create_booking
│   │   ├── edit_booking
│   │   ├── issue_invoice
│   │   ├── apply_discount
│   │   ├── refund_payment
│   │   ├── reconcile_payouts
│   │   ├── ledger_export
│   │   ├── aging_report
│   │   └── confirm_intake
│   │
│   └── Academic MCP (10 tools)
│       ├── create_programme
│       ├── create_course
│       ├── map_cefr_level
│       ├── schedule_class
│       ├── assign_teacher
│       ├── allocate_room
│       ├── register_lesson_template
│       ├── approve_lesson_plan
│       ├── link_cefr_descriptor
│       └── publish_materials
│
├── Authentication (JWT + Supabase)
├── Authorization (Scope-based)
└── Database (PostgreSQL via Supabase)
```

---

## Implementation Details

### 1. Project Structure

```
fastapi-server/
├── src/
│   ├── main.py                 # FastAPI application
│   ├── config.py               # Configuration management
│   ├── core/
│   │   ├── auth.py            # JWT authentication
│   │   ├── security.py        # Authorization helpers
│   │   └── database.py        # Database connection
│   ├── mcp/
│   │   ├── base.py            # Base MCP server class
│   │   ├── host.py            # MCP host orchestration
│   │   ├── types.py           # Type definitions
│   │   └── servers/
│   │       ├── finance.py     # Finance MCP (9 tools)
│   │       └── academic.py    # Academic MCP (10 tools)
│   └── api/
│       ├── mcp.py             # MCP API routes
│       └── health.py          # Health check endpoints
├── tests/
│   ├── test_finance_mcp.py
│   ├── test_academic_mcp.py
│   └── test_api.py
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md
```

### 2. MCP Servers Implemented

#### Finance MCP (9 Tools)

| Tool | Description | Scope |
|------|-------------|-------|
| `create_booking` | Create new student booking | `finance:*` |
| `edit_booking` | Modify existing booking | `finance:*` |
| `issue_invoice` | Generate invoice PDF | `finance:*` |
| `apply_discount` | Apply discount code | `finance:*` |
| `refund_payment` | Process refund | `finance:*` |
| `reconcile_payouts` | Match payments to invoices | `finance:*` |
| `ledger_export` | Export to accounting software | `finance:*` |
| `aging_report` | Accounts receivable aging | `finance:*` |
| `confirm_intake` | Confirm student intake | `finance:*` |

**Resources:**
- `mycastle://finance/invoices` - List of all invoices
- `mycastle://finance/outstanding` - Outstanding payments

**Prompts:**
- `finance:invoice_review` - AI invoice review prompt

#### Academic MCP (10 Tools)

| Tool | Description | Scope |
|------|-------------|-------|
| `create_programme` | Define new programme | `academic:*` |
| `create_course` | Create course in programme | `academic:*` |
| `map_cefr_level` | Map course to CEFR level | `academic:*` |
| `schedule_class` | Schedule class | `academic:*` |
| `assign_teacher` | Assign teacher to class | `academic:*` |
| `allocate_room` | Assign room to session | `academic:*` |
| `register_lesson_template` | Save lesson template | `academic:*` |
| `approve_lesson_plan` | Approve/reject lesson plan | `academic:*` |
| `link_cefr_descriptor` | Link CEFR descriptor | `academic:*` |
| `publish_materials` | Publish materials to class | `academic:*` |

**Resources:**
- `mycastle://academic/programmes` - All programmes
- `mycastle://academic/courses` - All courses
- `mycastle://academic/cefr-descriptors` - CEFR descriptors

**Prompts:**
- `academic:curriculum_design` - Curriculum design prompt

---

## API Endpoints

### Base URL
```
http://localhost:8000
```

### Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <jwt-token>
```

### Endpoints

#### Health & Status

**GET /health**
- Health check with MCP server status
- Response: `HealthResponse`

**GET /health/ready**
- Kubernetes readiness probe
- Response: 200 if ready, 503 if not

**GET /health/live**
- Kubernetes liveness probe
- Response: 200 always

#### MCP Operations

**GET /api/mcp/capabilities**
- List available tools, resources, prompts
- Filtered by user's scopes
- Response: `CapabilitiesResponse`

**POST /api/mcp/tools/{tool_name}**
- Execute MCP tool
- Body: `ToolCallRequest`
- Response: `ToolCallResponse`

**GET /api/mcp/resources?uri={uri}**
- Fetch MCP resource
- Response: `ResourceResponse`

**POST /api/mcp/prompts/{prompt_name}**
- Get prompt template
- Body: `PromptRequest`
- Response: `PromptResponse`

**GET /api/mcp/servers**
- List registered MCP servers
- Response: Server list with tool counts

---

## Usage Examples

### 1. Get Capabilities

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/mcp/capabilities
```

Response:
```json
{
  "tools": [
    {
      "name": "finance:create_booking",
      "description": "Create a new student booking for a course",
      "inputSchema": { ... },
      "scope": "finance:*"
    },
    ...
  ],
  "resources": [ ... ],
  "prompts": [ ... ],
  "serverInfo": {
    "name": "mycastle-fastapi-mcp",
    "version": "1.0.0",
    "servers": ["finance-mcp (finance:*)", "academic-mcp (academic:*)"]
  }
}
```

### 2. Call a Tool

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "student_id": "123",
      "programme_id": "456",
      "start_date": "2025-01-15",
      "weeks": 4,
      "accommodation": true
    }
  }' \
  http://localhost:8000/api/mcp/tools/finance:create_booking
```

Response:
```json
{
  "content": [
    {
      "type": "text",
      "text": {
        "success": true,
        "booking_id": "789",
        "message": "Booking created for 4 weeks starting 2025-01-15"
      }
    }
  ],
  "isError": false
}
```

### 3. Fetch a Resource

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/mcp/resources?uri=mycastle://finance/invoices"
```

### 4. Get a Prompt

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "booking_id": "789"
    }
  }' \
  http://localhost:8000/api/mcp/prompts/finance:invoice_review
```

---

## Deployment

### Local Development

1. **Set up environment:**
```bash
cd fastapi-server
cp .env.example .env
# Edit .env with your configuration
```

2. **Install dependencies:**
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. **Run server:**
```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Deployment

```bash
# Build image
docker build -t mycastle-fastapi-mcp .

# Run container
docker run -p 8000:8000 --env-file .env mycastle-fastapi-mcp
```

### Docker Compose

```bash
docker-compose up -d
```

This starts:
- FastAPI MCP server (port 8000)
- PostgreSQL database (port 5432)

---

## Integration with Next.js

The FastAPI backend works alongside the Next.js frontend:

### 1. Shared Authentication
- Both use Supabase JWT tokens
- Tokens are interchangeable
- Same user/tenant authentication

### 2. Shared Database
- Both connect to same Supabase PostgreSQL
- Same RLS policies apply
- Data consistency maintained

### 3. API Gateway Pattern (Optional)

```typescript
// Next.js API route can proxy to FastAPI
// app/src/app/api/mcp/proxy/route.ts
export async function POST(request: Request) {
  const token = await getToken();
  const response = await fetch('http://localhost:8000/api/mcp/tools/...', {
    headers: { Authorization: `Bearer ${token}` },
    body: await request.text(),
  });
  return response;
}
```

---

## Testing

### Run Tests

```bash
# All tests
pytest tests/ -v

# With coverage
pytest tests/ -v --cov=src

# Specific test file
pytest tests/test_finance_mcp.py -v
```

### Test Coverage

- ✅ MCP server initialization
- ✅ Tool registration (9 finance + 10 academic)
- ✅ Authorization scope checks
- ✅ Resource registration
- ✅ Prompt registration
- ✅ API endpoint authentication
- ✅ Tool count constraints (≤10 per server)

---

## Security

### Authentication
- JWT tokens via Supabase
- Token verification on every request
- Scope-based authorization

### Authorization
- Fine-grained scopes (`finance:*`, `academic:*`)
- Role-based access control
- Tenant isolation (RLS)

### Best Practices
- No secrets in code
- Environment variables for config
- HTTPS in production
- Rate limiting (recommended)
- Audit logging for all operations

---

## Performance

### Optimization Strategies

1. **Async/Await**: All database queries are async
2. **Connection Pooling**: SQLAlchemy connection pool
3. **Caching**: Implement Redis for resource caching
4. **Horizontal Scaling**: Stateless design allows multiple instances

### Monitoring

- Health check endpoints for k8s/Docker
- Logging at INFO level (configurable)
- Prometheus metrics (recommended addition)

---

## Future Enhancements

### Planned MCP Servers

1. **Attendance & Compliance MCP** (8 tools)
2. **Student Services MCP** (9 tools)
3. **Operations & Quality MCP** (8 tools)
4. **Student MCP** (10 tools)

### Feature Additions

- [ ] Websocket support for real-time updates
- [ ] GraphQL endpoint alongside REST
- [ ] Redis caching layer
- [ ] Prometheus metrics
- [ ] OpenTelemetry tracing
- [ ] Rate limiting middleware
- [ ] API versioning (v2, v3)

---

## Troubleshooting

### Common Issues

**1. Database connection fails**
```bash
# Check Supabase URL and credentials in .env
# Verify network connectivity
```

**2. Authentication fails**
```bash
# Verify JWT_SECRET_KEY matches Supabase
# Check token expiration
# Ensure Supabase service role key is correct
```

**3. Tool not found**
```bash
# Check tool name format: 'scope:tool_name'
# Verify user has required scope
# Check MCP server initialization logs
```

**4. Docker container fails to start**
```bash
# Check .env file exists
# Verify port 8000 is available
# Check logs: docker logs mycastle-fastapi-mcp
```

---

## Support & Contribution

### Documentation
- Full API docs: http://localhost:8000/docs (Swagger UI)
- ReDoc: http://localhost:8000/redoc

### Code Quality
- Type hints throughout
- Docstrings for all public methods
- Black formatting
- Ruff linting
- Mypy type checking

### Testing
- 90%+ test coverage target
- Pytest for all tests
- Async test support

---

## Comparison: Next.js vs FastAPI MCP

| Feature | Next.js MCP | FastAPI MCP |
|---------|-------------|-------------|
| **Language** | TypeScript | Python |
| **Framework** | Next.js | FastAPI |
| **Performance** | Good | Excellent |
| **ML/AI Libraries** | Limited | Extensive |
| **Async Support** | Yes | Yes |
| **Type Safety** | Yes | Yes (with mypy) |
| **Deployment** | Vercel/Node | Docker/K8s |
| **Database ORM** | Drizzle | SQLAlchemy |
| **Implemented MCPs** | Identity, Teacher | Finance, Academic |
| **Total Tools** | 16 | 19 |

---

## Conclusion

The FastAPI MCP integration provides a robust, scalable, and Python-native alternative for MCP server implementation. It complements the existing Next.js backend while offering:

- **Better performance** for compute-intensive operations
- **Access to Python ecosystem** (NumPy, pandas, scikit-learn)
- **Independent deployment** and scaling
- **Full REST API compatibility**

Both backends can coexist and serve different use cases:
- **Next.js**: UI rendering, SSR, user-facing features
- **FastAPI**: MCP operations, AI/ML features, data processing

---

**Contact:** MyCastle Development Team
**Last Updated:** 2025-11-14
**Version:** 1.0.0
