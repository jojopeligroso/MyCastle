export interface MCPResource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

export interface AdminContext {
  actorId: string;
  actorRole: string;
  scopes: string[];
  supabaseToken: string;
}

export interface AuditEntry {
  actor: string;
  action: string;
  target: string;
  scope: string;
  diffHash: string;
  timestamp: string;
  correlationId: string;
}

export interface JWTClaims {
  sub: string;
  role: string;
  scopes?: string[];
  aud?: string;
  exp?: number;
  iat?: number;
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
