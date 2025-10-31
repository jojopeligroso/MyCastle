# Admin MCP Server - Setup Guide

## Current Status

✅ **Complete**:
- Core MCP protocol implementation (JSON-RPC 2.0)
- 15 operational tools (user management, academic ops, financial, compliance)
- 8 resources for read-only data access
- JWT authentication with JWKS verification
- Scope-based authorization
- Audit logging system
- STDIO and HTTP transport adapters
- PII masking and security controls

⚠️ **Needs Configuration**:
- Supabase database type generation
- Environment variables (.env file)
- Database schema deployment
- Client configuration (Claude Desktop/Cursor/etc.)

---

## Prerequisites

1. **Node.js** >= 18.x
2. **npm** >= 9.x
3. **Supabase Project** with:
   - Database schema deployed (see `/esl-mcp-spec/spec/08-database.md`)
   - Auth enabled with JWT issu ance
   - Service role key
4. **Supabase CLI** (for type generation):
   ```bash
   npm install -g supabase
   ```

---

## Step 1: Generate Database Types

The project currently has TypeScript errors because the Supabase database types haven't been generated. Run:

```bash
# From the project root
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts

# Or if you have supabase CLI linked:
npx supabase gen types typescript --linked > src/types/database.types.ts
```

Then update `src/types/index.ts` to import and export these types:

```typescript
// Add to src/types/index.ts
export type { Database } from './database.types.js';
```

Update Supabase client creation in tools/resources to use generated types:

```typescript
import type { Database } from '../types/index.js';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  context.supabaseToken
);
```

---

## Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials:
   ```bash
   # Required values
   JWKS_URI=https://YOUR_PROJECT_ID.supabase.co/auth/v1/jwks
   SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

   # Optional
   JWT_AUDIENCE=admin-mcp
   MCP_TRANSPORT=stdio
   MCP_FILES_DIR=/tmp/mcp-files
   ```

3. Get your Supabase keys from:
   - Dashboard → Project Settings → API
   - Service role key (NOT the anon key)

---

## Step 3: Build the Project

```bash
npm install
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

---

## Step 4: Test the Server

### Test in STDIO mode:

```bash
# Development (with auto-reload)
npm run dev:stdio

# Production (compiled)
node dist/index.js stdio
```

Send a test JSON-RPC request via stdin:
```json
{"jsonrpc":"2.0","id":1,"method":"ping"}
```

Expected response:
```json
{"jsonrpc":"2.0","result":{"pong":true,"timestamp":"2025-10-30T..."},"id":1}
```

### Test in HTTP mode:

```bash
# Development
PORT=3000 npm run dev:http

# Production
PORT=3000 node dist/index.js http
```

Test with curl:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping"}'
```

---

## Step 5: Configure for Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "admin-esl": {
      "command": "node",
      "args": [
        "/home/eoin/work/esl-learning-platform/admin-mcp/dist/index.js",
        "stdio"
      ],
      "env": {
        "JWKS_URI": "https://YOUR_PROJECT.supabase.co/auth/v1/jwks",
        "SUPABASE_URL": "https://YOUR_PROJECT.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "MCP_AUTH_HEADER": "Bearer YOUR_LONG_LIVED_JWT_TOKEN"
      }
    }
  }
}
```

**Note**: The `MCP_AUTH_HEADER` should be a JWT token with the appropriate scopes. For development, you can generate a long-lived token from Supabase or implement a token refresh mechanism.

Restart Claude Desktop to load the server.

---

## Step 6: Configure for Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "admin-esl": {
      "command": "node",
      "args": [
        "/home/eoin/work/esl-learning-platform/admin-mcp/dist/index.js",
        "stdio"
      ],
      "env": {
        "JWKS_URI": "https://YOUR_PROJECT.supabase.co/auth/v1/jwks",
        "SUPABASE_URL": "https://YOUR_PROJECT.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "MCP_AUTH_HEADER": "Bearer YOUR_LONG_LIVED_JWT_TOKEN"
      }
    }
  }
}
```

Restart Cursor to load the server.

---

## Step 7: Configure for Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "admin-esl": {
      "command": "node",
      "args": [
        "/home/eoin/work/esl-learning-platform/admin-mcp/dist/index.js",
        "stdio"
      ],
      "env": {
        "JWKS_URI": "https://YOUR_PROJECT.supabase.co/auth/v1/jwks",
        "SUPABASE_URL": "https://YOUR_PROJECT.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "MCP_AUTH_HEADER": "Bearer YOUR_LONG_LIVED_JWT_TOKEN"
      }
    }
  }
}
```

---

## Authentication Flow

### Development Mode

For development, use a long-lived JWT token:

1. Generate from Supabase:
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'admin@example.com',
     password: 'your-password'
   });
   const token = data.session.access_token;
   ```

2. Add to `MCP_AUTH_HEADER` in client config

### Production Mode

For production, implement proper authentication:

1. **Host-mediated**: Have your Host service authenticate users and pass short-lived JWTs to the MCP server
2. **Token Refresh**: Implement automatic token refresh in the STDIO adapter
3. **SSE/WebSocket**: Use HTTP transport with proper auth headers

---

## Available Tools

The Admin MCP provides 15 tools:

### User Management
- `create-user` - Create new users with roles
- `update-user` - Update user profiles
- `assign-role` - Assign roles to users
- `search-directory` - Search user directory

### Academic Operations
- `create-class` - Create new classes
- `plan-roster` - Assign teachers to classes
- `record-attendance` - Record student attendance
- `adjust-enrolment` - Manage student enrolments

### Financial Operations
- `ar-snapshot` - Generate AR aging reports
- `raise-refund-req` - Create refund requests
- `gen-register-csv` - Export class registers

### Accommodation
- `add-accommodation` - Create accommodation placements
- `vendor-status` - Update vendor status

### Compliance & Reporting
- `compliance-pack` - Generate compliance document packs
- `publish-ops-report` - Publish operations reports

---

## Available Resources

The Admin MCP exposes 8 read-only resources:

- `res://admin/reports/weekly-ops` - Weekly operations snapshot
- `res://admin/reports/ar-aging` - Accounts receivable aging
- `res://admin/users` - User directory
- `res://admin/class-load` - Class capacity analysis
- `res://admin/compliance/visa-expiries` - Visa expiry tracking
- `res://admin/accommodation-occupancy` - Accommodation occupancy
- `res://admin/registers/{class_id}/{iso_week}` - Class registers
- `res://admin/audit-rollup` - Audit log summaries

---

## Scopes and Permissions

All operations require appropriate JWT scopes:

### User Management
- `admin.read.user` - Read user data (non-PII)
- `admin.write.user` - Modify user data
- `admin.delete.user` - Delete users
- `admin.read.pii` - Read personally identifiable information
- `admin.write.pii` - Modify PII
- `admin.write.role` - Assign roles

### Academic Operations
- `admin.read.class`, `admin.write.class`
- `admin.read.roster`, `admin.write.roster`
- `admin.read.attendance`, `admin.write.attendance`
- `admin.read.enrolment`, `admin.write.enrolment`
- `admin.read.register`

### Financial Operations
- `admin.read.finance`, `admin.write.finance`
- `admin.write.refund`

### Accommodation
- `admin.read.accommodation`, `admin.write.accommodation`

### Compliance
- `admin.read.compliance`, `admin.write.compliance`
- `admin.read.vendor`, `admin.write.vendor`

### Reporting
- `admin.read.report`, `admin.write.report`

### Super Admin
- `admin.super` - All permissions

Configure scopes in your JWT claims:
```json
{
  "sub": "user-uuid",
  "role": "admin",
  "scopes": ["admin.super"],
  "tenant_id": "tenant-uuid"
}
```

---

## Testing with MCP Inspector

Use the official MCP Inspector to test your server:

```bash
npx @modelcontextprotocol/inspector node dist/index.js stdio
```

This launches a web UI at `http://localhost:6274` where you can:
- List available tools and resources
- Execute tools with test data
- View resource responses
- Debug authentication issues

---

## Troubleshooting

### "JWKS_URI environment variable is required"
- Make sure `.env` file exists and has `JWKS_URI` set
- Check that `dotenv` is loading correctly

### "Authentication failed"
- Verify JWT token is valid and not expired
- Check that `JWKS_URI` matches your Supabase project
- Ensure JWT has required scopes in claims

### "RLS policy violation"
- The service role key bypasses RLS, but user tokens don't
- Ensure your RLS policies allow the operation
- Check that `tenant_id` in JWT matches row-level policies

### TypeScript compilation errors
- Generate database types first (Step 1)
- Ensure all dependencies are installed
- Check TypeScript version is >= 5.3

### "Tool not found"
- Verify tool name matches exactly (case-sensitive, use hyphens)
- Check that tool is registered in `src/core/tools/index.ts`
- Rebuild project after adding new tools

---

## Next Steps

1. **Generate Database Types** (Step 1 above)
2. **Deploy Database Schema** from `/esl-mcp-spec/spec/08-database.md`
3. **Configure Environment** with your Supabase credentials
4. **Build and Test** the server
5. **Add to AI Clients** (Claude Desktop, Cursor, etc.)
6. **Implement Host Service** to orchestrate cross-MCP workflows
7. **Add More Tools** as needed (see comprehensive plan in planning docs)

---

## Architecture References

- **Full Specification**: `/esl-mcp-spec/spec/04-admin-mcp.md`
- **Database Schema**: `/esl-mcp-spec/spec/08-database.md`
- **System Architecture**: `/esl-mcp-spec/spec/02-system-architecture.md`
- **MCP Protocol**: `/esl-mcp-spec/spec/03-mcp.md`

---

## Support

For issues or questions:
1. Check the specification docs in `/esl-mcp-spec/spec/`
2. Review audit logs in `stderr` output
3. Test with MCP Inspector
4. Check Supabase dashboard for RLS policy issues

---

**Version**: 1.0.0
**Last Updated**: 2025-10-30
**Status**: Ready for configuration and deployment
