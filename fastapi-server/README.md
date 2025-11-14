# MyCastle FastAPI MCP Server

FastAPI-based Model Context Protocol (MCP) server for MyCastle ESL school management system.

## Overview

This FastAPI server provides Python-based MCP server implementations that work alongside the Next.js backend. It implements:

- **Finance MCP**: 9 tools for invoicing, payments, and financial operations
- **Academic Operations MCP**: 10 tools for programmes, courses, and scheduling
- Full JWT authentication and authorization
- Scope-based access control
- Integration with Supabase database

## Architecture

```
fastapi-server/
├── src/
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py               # Configuration management
│   ├── core/
│   │   ├── auth.py            # Authentication & JWT handling
│   │   ├── security.py        # Authorization & scope validation
│   │   └── database.py        # Database connection
│   ├── mcp/
│   │   ├── base.py            # Base MCP server classes
│   │   ├── host.py            # MCP host orchestration
│   │   ├── types.py           # MCP type definitions
│   │   └── servers/
│   │       ├── finance.py     # Finance MCP implementation
│   │       └── academic.py    # Academic MCP implementation
│   ├── api/
│   │   ├── mcp.py             # MCP API routes
│   │   └── health.py          # Health check endpoints
│   └── models/
│       └── schemas.py          # Pydantic models
├── tests/
│   ├── test_finance_mcp.py
│   └── test_academic_mcp.py
├── requirements.txt
├── pyproject.toml
└── README.md
```

## Installation

### Prerequisites

- Python 3.11+
- PostgreSQL (via Supabase)
- Virtual environment tool (venv, conda, etc.)

### Setup

1. **Create virtual environment:**
```bash
cd fastapi-server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run the server:**
```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /api/mcp/capabilities` - List available MCP tools

### MCP Operations
- `POST /api/mcp/tools/{tool_name}` - Execute MCP tool
- `GET /api/mcp/resources` - Fetch MCP resources
- `GET /api/mcp/prompts/{prompt_name}` - Get prompt templates

### Finance MCP Tools
1. `create_booking` - Create new student booking
2. `edit_booking` - Modify existing booking
3. `issue_invoice` - Generate invoice PDF
4. `apply_discount` - Apply discount code
5. `refund_payment` - Process refund
6. `reconcile_payouts` - Match payments to invoices
7. `ledger_export` - Export to accounting software
8. `aging_report` - Accounts receivable aging
9. `confirm_intake` - Confirm student intake

### Academic MCP Tools
1. `create_programme` - Define new programme
2. `create_course` - Define course within programme
3. `map_cefr_level` - Map course to CEFR level
4. `schedule_class` - Create class schedule
5. `assign_teacher` - Assign teacher to class
6. `allocate_room` - Assign classroom to session
7. `register_lesson_template` - Save reusable lesson template
8. `approve_lesson_plan` - Admin approval workflow
9. `link_cefr_descriptor` - Link official CEFR descriptor
10. `publish_materials` - Publish materials to students

## Authentication

All endpoints require JWT authentication via Bearer token:

```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
  http://localhost:8000/api/mcp/capabilities
```

## Scope-Based Authorization

Tools are protected by scopes:
- `finance:*` - Full access to Finance MCP
- `academic:*` - Full access to Academic MCP
- Granular scopes like `finance:create_booking`, `academic:schedule_class`

## Testing

Run tests with pytest:

```bash
pytest tests/ -v --cov=src
```

## Development

Format code:
```bash
black src/ tests/
```

Lint code:
```bash
ruff check src/ tests/
```

Type check:
```bash
mypy src/
```

## Docker

Build and run with Docker:

```bash
docker build -t mycastle-fastapi-mcp .
docker run -p 8000:8000 --env-file .env mycastle-fastapi-mcp
```

## Integration with Next.js

The FastAPI server works alongside the Next.js backend:

1. Next.js handles UI, SSR, and some API routes
2. FastAPI handles MCP operations, especially Python-intensive tasks
3. Both share the same Supabase database
4. JWT tokens are compatible between both backends

## License

Proprietary - MyCastle Platform
