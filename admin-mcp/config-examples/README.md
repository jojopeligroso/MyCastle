# MCP Client Configuration Examples

This directory contains example configuration files for various MCP clients.

## Claude Desktop

**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
**Location**: `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
**Location**: `~/.config/Claude/claude_desktop_config.json` (Linux)

Copy contents from `claude-desktop.json` and update:
- Replace `YOUR_PROJECT_ID` with your Supabase project ID
- Replace `your-service-role-key-here` with your actual service role key
- Update the absolute path to match your installation

Restart Claude Desktop after configuration.

## Cursor

**Location**: `~/.cursor/mcp.json`

Copy contents from `cursor.json` and update credentials.

Restart Cursor after configuration.

## Windsurf

**Location**: `~/.codeium/windsurf/mcp_config.json`

Use the same format as Cursor configuration.

## VS Code (with MCP extension)

Add to VS Code settings.json under `"mcp.servers"`:

```json
{
  "mcp.servers": {
    "admin-esl": {
      "command": "node",
      "args": ["/path/to/admin-mcp/dist/index.js", "stdio"],
      "env": { /* same as above */ }
    }
  }
}
```

## Testing Configuration

After adding configuration:

1. **Restart the client** (Claude Desktop, Cursor, etc.)
2. **Check server logs** - look for connection messages
3. **List tools** - ask AI: "What MCP tools are available?"
4. **Test ping** - ask AI: "Use the admin-esl MCP server to ping"

## Troubleshooting

If the server doesn't connect:

1. **Check paths are absolute** (not relative)
2. **Verify dist/index.js exists** (run `npm run build` first)
3. **Check environment variables** are set correctly
4. **Look for error messages** in client logs:
   - Claude Desktop: Check console logs (Help → Show Logs)
   - Cursor: Check Dev Tools console
5. **Test manually**:
   ```bash
   cd /home/eoin/work/esl-learning-platform/admin-mcp
   npm run dev:stdio
   ```

## Security Notes

- **Never commit** actual credentials to version control
- **Use environment-specific** credentials (dev, staging, prod)
- **Rotate service role keys** periodically
- **Consider using** short-lived JWTs instead of service role key for production
- **Implement token refresh** for long-running sessions
