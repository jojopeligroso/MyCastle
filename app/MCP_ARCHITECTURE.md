# MCP Architecture Refactoring

## Overview

This document explains the architectural refactoring of the MCP (Model Context Protocol) implementation in MyCastle from library-style imports to proper protocol-based communication.

## Problem with Previous Architecture

The previous implementation treated "MCP servers" as importable TypeScript modules:

```typescript
// ❌ OLD: Direct imports - not real MCP protocol
import { identityAccessMCPConfig } from './servers/identity/IdentityAccessMCP';
host.registerServer(identityAccessMCPConfig); // Just an object
const result = await tool.handler(input, session); // Direct function call
```

**Issues:**

- ❌ Not using MCP protocol at all - just regular function calls
- ❌ No process isolation - everything in one Node.js process
- ❌ Not language-agnostic - can't use Python/Rust/Go servers
- ❌ Tight coupling - servers imported at compile-time
- ❌ Not pluggable - can't add/remove servers dynamically
- ❌ Defeats MCP's purpose - could just use service layer instead

## New Architecture: Proper MCP Protocol

The new implementation uses actual MCP protocol with separate server processes:

```typescript
// ✅ NEW: Real MCP protocol with separate processes
const client = new Client({ name: 'mycastle-host', version: '1.0.0' });

const transport = new StdioClientTransport({
  command: 'tsx',
  args: ['./servers/identity/server.ts'],
});

await client.connect(transport); // Connect via JSON-RPC 2.0
const result = await client.callTool({ name: 'create_user', arguments: input });
```

**Benefits:**

- ✅ **Real MCP Protocol**: JSON-RPC 2.0 over stdio transport
- ✅ **Process Isolation**: Each server runs independently
- ✅ **Language Agnostic**: Can use any language that supports MCP SDK
- ✅ **Loose Coupling**: Servers spawned at runtime, not compile-time
- ✅ **Pluggable**: Add/remove servers without code changes
- ✅ **Standard Compliant**: Follows MCP specification properly

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Next.js App                        │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │          MCPHost (Client)                   │    │
│  │  - Uses @modelcontextprotocol/sdk/client   │    │
│  │  - StdioClientTransport                     │    │
│  │  - Spawns server processes                  │    │
│  └───────────┬──────────────┬──────────────────┘    │
│              │              │                        │
└──────────────┼──────────────┼────────────────────────┘
               │ stdio        │ stdio
               │ JSON-RPC     │ JSON-RPC
               ▼              ▼
    ┌──────────────┐  ┌──────────────┐
    │  Identity    │  │   Finance    │
    │  MCP Server  │  │  MCP Server  │
    │              │  │              │
    │ Separate     │  │ Separate     │
    │ Process      │  │ Process      │
    └──────────────┘  └──────────────┘
```

## File Structure

```
app/src/lib/mcp/
├── host/
│   ├── MCPHost.ts (OLD - library-style)
│   └── MCPHostRefactored.ts (NEW - protocol-based)
├── servers/
│   ├── identity/
│   │   ├── IdentityAccessMCP.ts (OLD - just object exports)
│   │   └── server.ts (NEW - standalone MCP server process)
│   ├── finance/
│   │   └── server.ts (TODO)
│   ├── academic/
│   │   └── server.ts (TODO)
│   └── ...
├── init.ts (OLD)
└── initRefactored.ts (NEW)
```

## Implementation Details

### Server Side (Each MCP Server)

Each server is now a standalone process that:

1. Uses `McpServer` from `@modelcontextprotocol/sdk/server`
2. Uses `StdioServerTransport` for communication
3. Runs independently via `tsx server.ts`
4. Registers tools, resources, and prompts using SDK API

**Example: Identity MCP Server**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer(
  { name: 'identity-access-mcp', version: '3.0.0' },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

// Register tools
server.registerTool(
  'create_user',
  {
    /* config */
  },
  async args => {
    // Tool implementation
  }
);

// Connect to stdio
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Client Side (MCPHost)

The host connects to servers via stdio transport:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Spawn and connect to server process
const client = new Client({ name: 'mycastle-host', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: 'tsx',
  args: ['./servers/identity/server.ts'],
});

await client.connect(transport);

// Call tools via protocol
const result = await client.callTool({
  name: 'create_user',
  arguments: { email: 'user@example.com', ... },
  _meta: { tenant_id: '...', user_id: '...' }
});
```

## Running MCP Servers

### Standalone Mode (for testing)

```bash
npm run mcp:identity  # Start Identity MCP server
npm run mcp:finance   # Start Finance MCP server
```

### Production Mode

Servers are automatically spawned by the MCPHost when the application starts.

## Migration Status

### ✅ Completed

- [x] Refactored MCPHost to use MCP Client with stdio transport
- [x] Created standalone Identity MCP server
- [x] Updated API routes to use new architecture
- [x] Added npm scripts for running servers

### 🚧 In Progress

- [ ] Convert remaining servers (Finance, Academic, Attendance, Teacher)
- [ ] Test full end-to-end communication
- [ ] Update tests to work with new architecture

### 📝 TODO

- [ ] Add health monitoring for server processes
- [ ] Implement server restart on crash
- [ ] Add request/response logging
- [ ] Create admin dashboard for MCP server status
- [ ] Update deployment scripts for production

## API Changes

The API routes remain the same from the client perspective, but internally they now:

1. Use `getMCPHostInstance()` (async) instead of synchronous
2. Communicate with servers via JSON-RPC 2.0
3. Handle server process lifecycle

**API Example:**

```typescript
// POST /api/mcp/tools/create_user
const host = await getMCPHostInstance(); // Now async!
const result = await host.executeTool('create_user', input, session);
// Returns proper MCP protocol response
```

## Testing

```bash
# Test Identity MCP server communication
npm run test -- src/lib/mcp/servers/identity/__tests__/

# Test MCP Host integration
npm run test -- src/lib/mcp/host/__tests__/
```

## Benefits Summary

| Aspect                  | Old (Library)   | New (Protocol)     |
| ----------------------- | --------------- | ------------------ |
| **Communication**       | Function calls  | JSON-RPC 2.0       |
| **Transport**           | None            | stdio              |
| **Process Model**       | Single process  | Multiple processes |
| **Language Support**    | TypeScript only | Any language       |
| **Pluggability**        | Compile-time    | Runtime            |
| **Protocol Compliance** | ❌ No           | ✅ Yes             |
| **Standards-Based**     | ❌ No           | ✅ Yes             |
| **Process Isolation**   | ❌ No           | ✅ Yes             |

## References

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MyCastle spec/03-mcp.md](../../spec/03-mcp.md)
