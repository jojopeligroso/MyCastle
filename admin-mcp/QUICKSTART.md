# Admin MCP - Quick Start Guide

## What You Have

A fully-implemented Admin MCP server with:
- ✅ 15 operational tools (user management, classes, attendance, financial, compliance)
- ✅ 8 resources for read-only data access
- ✅ JWT authentication with scopes
- ✅ Audit logging
- ✅ Security controls (PII masking, RLS)

## What You Need

1. **Supabase Database Types**
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
   ```

2. **Environment Configuration**
   - Edit `.env` file with your Supabase credentials
   - Get values from Supabase Dashboard → Project Settings → API

3. **Build**
   ```bash
   npm install
   npm run build
   ```

## Test It Works

```bash
# Test STDIO mode
npm run dev:stdio

# Send test request (in another terminal):
echo '{"jsonrpc":"2.0","id":1,"method":"ping"}' | npm run dev:stdio

# Or test HTTP mode:
PORT=3000 npm run dev:http

# In another terminal:
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping"}'
```

## Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

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
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

Restart Claude Desktop.

## Add to Cursor

Edit `~/.cursor/mcp.json`:

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
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

Restart Cursor.

## What's Next

See `SETUP.md` for comprehensive setup instructions including:
- Database type generation details
- Authentication configuration
- Available tools and resources
- Scope requirements
- Troubleshooting

## Key Files

- `SETUP.md` - Complete setup guide
- `TOOLS_SUMMARY.md` - Tool implementation details
- `TOOLS_REFERENCE.md` - Tool usage reference
- `README.md` - Project overview
- `/esl-mcp-spec/spec/04-admin-mcp.md` - Full specification

## Need Help?

1. **TypeScript Errors?** → Generate database types (Step 1 above)
2. **Auth Issues?** → Check JWKS_URI and JWT token in `.env`
3. **Tool Not Found?** → Verify tool name, rebuild project
4. **RLS Errors?** → Check Supabase RLS policies match JWT claims

---

**Current Blocker**: Database types need generation before build will succeed.
**Estimated Time**: 15-20 minutes to get fully operational once Supabase credentials are configured.
