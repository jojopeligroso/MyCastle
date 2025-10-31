# Admin MCP Server

Admin MCP server for ESL Learning Platform - provides secure administrative operations with comprehensive audit logging.

## Features

- **JWT Authentication**: JWKS-based token verification
- **Scope-based Authorization**: Fine-grained permission control
- **Audit Logging**: Tamper-evident audit trail for all operations
- **RLS Enforcement**: Supabase Row Level Security integration
- **Multi-transport**: Supports both stdio and HTTP transports

## Project Structure

```
admin-mcp/
├── src/
│   ├── adapters/         # Transport adapters (stdio, http)
│   ├── core/
│   │   ├── auth/        # Authentication & authorization
│   │   ├── audit/       # Audit logging
│   │   ├── resources/   # MCP resources
│   │   └── tools/       # MCP tools
│   ├── lib/             # Shared utilities
│   └── types/           # TypeScript types
├── tests/               # Test files
└── dist/                # Compiled output
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Build the project:
```bash
npm run build
```

## Development

Run in stdio mode (for MCP clients):
```bash
npm run dev:stdio
```

Run in HTTP mode (for API access):
```bash
npm run dev:http
```

## Testing

```bash
npm test
```

## Security

- All operations require valid JWT with appropriate scopes
- PII access is strictly controlled via `admin.read.pii` and `admin.write.pii` scopes
- All mutations are logged to audit trail with diff hashes
- RLS policies are enforced through Supabase

## Scopes

- `admin.read.user` - Read user data (non-PII)
- `admin.write.user` - Modify user data (non-PII)
- `admin.delete.user` - Delete users
- `admin.read.pii` - Read personally identifiable information
- `admin.write.pii` - Modify personally identifiable information
- `admin.read.subscription` - Read subscription data
- `admin.write.subscription` - Modify subscriptions
- `admin.read.audit` - Read audit logs
- `admin.super` - Super admin (all permissions)

## Audit Logging

All operations emit audit entries to stderr in JSON format:

```json
{
  "type": "audit",
  "actor": "user-id",
  "action": "update_user",
  "target": "user:123",
  "scope": "admin.write.user",
  "diffHash": "sha256-hash",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "correlationId": "uuid"
}
```
