/**
 * Host Service Home Page
 */

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>ESL Learning Platform - Host Service</h1>
      <p>MCP Orchestration Service</p>

      <h2>Endpoints</h2>
      <ul>
        <li>
          <code>POST /api/chat/admin</code> - Admin MCP chat endpoint
        </li>
        <li>
          <code>GET /api/chat/admin</code> - Admin MCP status and available tools
        </li>
      </ul>

      <h2>Status</h2>
      <p>Service is running ✅</p>

      <h2>Documentation</h2>
      <ul>
        <li><a href="/docs">API Documentation</a></li>
        <li><a href="https://github.com/jojopeligroso/esl-mcp-spec">MCP Specifications</a></li>
      </ul>
    </div>
  );
}
