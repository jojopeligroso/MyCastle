# 10. Identity & Access MCP Specification

> **Document status:** Living specification. **Priority:** Phase 1 (High) - Security-critical MCP
> **Version:** 3.0.0 | **Last Updated:** 2025-11-08

---

## 10.1 Overview

### Purpose

The **Identity & Access MCP** server provides tools and context for authentication, authorization, and role management operations. It serves super-administrators and identity officers who need to:

- Create and manage user accounts
- Assign and modify user roles
- Set and manage fine-grained permissions
- Revoke sessions and API keys
- Audit access logs and security events

### Role Requirements

- **Who Can Access**: Users with `role: "super_admin"` or `identity:write` scope in their JWT claims
- **Tenant Isolation**: All operations are scoped to the admin's `tenant_id`
- **Authorization**: Identity MCP verifies both role/scope and tenant on every operation
- **Audit Level**: Highest (all operations logged with full context)

### MCP Server Identity

```typescript
{
  name: "identity-access-mcp",
  version: "3.0.0",
  protocol_version: "2024-11-05",
  capabilities: {
    resources: true,
    tools: true,
    prompts: true
  }
}
```

### Domain Scope

**Authorization Scopes**: `identity:*`, `identity:read`, `identity:write`, `identity:admin`

**Why Separate from Admin MCP?**
- Security-critical operations require highest audit level
- Different authorization model (super-admin only)
- Minimal change frequency (stable API)
- Smallest attack surface (6 tools only)
- Enables principle of least privilege

---

## 10.2 Resources

Resources provide read-only contextual data to the LLM for identity operations.

### 10.2.1 User Directory

**URI**: `identity://user_directory`

**Description**: Complete user directory with roles and permissions

**Authorization**: `identity:read` scope required

**Content**:
```json
{
  "users": [
    {
      "id": "user-uuid-1",
      "email": "admin@school.com",
      "name": "Michael Chen",
      "role": "admin",
      "scopes": ["academic:*", "attendance:*", "finance:read"],
      "status": "active",
      "mfa_enabled": true,
      "created_at": "2025-01-15T10:30:00Z",
      "last_login": "2025-11-08T09:22:00Z",
      "created_by": "user-uuid-0",
      "tenant_id": "tenant-uuid-1"
    },
    {
      "id": "user-uuid-2",
      "email": "teacher@school.com",
      "name": "Sarah Johnson",
      "role": "teacher",
      "scopes": ["teacher:*"],
      "status": "active",
      "mfa_enabled": false,
      "created_at": "2025-02-01T09:00:00Z",
      "last_login": "2025-11-08T08:15:00Z",
      "created_by": "user-uuid-1",
      "tenant_id": "tenant-uuid-1"
    }
  ],
  "total": 2,
  "filters_applied": "none"
}
```

**Use Case**: LLM uses this to answer "Who has super_admin access?" or "List all users with finance:write scope"

---

### 10.2.2 Active Sessions

**URI**: `identity://active_sessions`

**Description**: Current active user sessions

**Authorization**: `identity:read` scope required

**Content**:
```json
{
  "sessions": [
    {
      "session_id": "sess-uuid-1",
      "user_id": "user-uuid-1",
      "user_email": "admin@school.com",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "created_at": "2025-11-08T09:00:00Z",
      "last_activity": "2025-11-08T09:22:00Z",
      "expires_at": "2025-11-08T17:00:00Z",
      "tenant_id": "tenant-uuid-1"
    }
  ],
  "total": 12,
  "active_in_last_hour": 8
}
```

**Use Case**: "Show me all active sessions" or "Who's logged in right now?"

---

### 10.2.3 Access Audit Log

**URI**: `identity://access_audit_log?limit=50`

**Description**: Recent access and authentication events

**Authorization**: `identity:admin` scope required

**Content**:
```json
{
  "events": [
    {
      "event_id": "evt-uuid-1",
      "timestamp": "2025-11-08T09:22:00Z",
      "event_type": "login_success",
      "user_id": "user-uuid-1",
      "user_email": "admin@school.com",
      "ip_address": "192.168.1.100",
      "details": {
        "mfa_verified": true,
        "device": "Chrome on Windows"
      },
      "tenant_id": "tenant-uuid-1"
    },
    {
      "event_id": "evt-uuid-2",
      "timestamp": "2025-11-08T09:15:00Z",
      "event_type": "role_updated",
      "user_id": "user-uuid-2",
      "user_email": "teacher@school.com",
      "changed_by": "user-uuid-1",
      "details": {
        "old_role": "teacher",
        "new_role": "admin",
        "reason": "Promoted to department head"
      },
      "tenant_id": "tenant-uuid-1"
    },
    {
      "event_id": "evt-uuid-3",
      "timestamp": "2025-11-08T08:45:00Z",
      "event_type": "login_failed",
      "user_email": "unknown@school.com",
      "ip_address": "192.168.1.200",
      "details": {
        "reason": "invalid_credentials",
        "attempt_number": 3
      },
      "tenant_id": "tenant-uuid-1"
    }
  ],
  "total": 50,
  "period": "last_24_hours"
}
```

**Use Case**: "Show recent login failures" or "Who changed user roles today?"

---

### 10.2.4 Permission Scopes

**URI**: `identity://permission_scopes`

**Description**: Available authorization scopes and their descriptions

**Content**:
```json
{
  "scopes": [
    {
      "scope": "identity:*",
      "description": "Full access to identity and access management",
      "implied_scopes": ["identity:read", "identity:write", "identity:admin"],
      "requires_role": "super_admin"
    },
    {
      "scope": "academic:write",
      "description": "Create and modify programmes, courses, and classes",
      "requires_role": "admin"
    },
    {
      "scope": "finance:write",
      "description": "Create invoices, record payments, manage finances",
      "requires_role": "admin"
    },
    {
      "scope": "teacher:*",
      "description": "Full teacher capabilities (lesson planning, attendance, grading)",
      "requires_role": "teacher"
    },
    {
      "scope": "student:*",
      "description": "Full student capabilities (view materials, submit homework, AI tutor)",
      "requires_role": "student"
    }
  ],
  "total": 15
}
```

**Use Case**: "What scopes are available?" or "What does finance:write allow?"

---

## 10.3 Tools

Tools are callable functions that perform identity and access management actions.

### 10.3.1 create_user

**Description**: Create a new user account with specified role and permissions

**Authorization**: `identity:write` scope required

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    email: {
      type: "string",
      format: "email",
      description: "User's email address (must be unique)"
    },
    name: {
      type: "string",
      minLength: 1,
      description: "User's full name"
    },
    role: {
      type: "string",
      enum: ["super_admin", "admin", "teacher", "student", "guest"],
      description: "User's primary role in the system"
    },
    scopes: {
      type: "array",
      items: { type: "string" },
      description: "Fine-grained permission scopes (optional, defaults based on role)"
    },
    password: {
      type: "string",
      minLength: 12,
      description: "Initial password (optional, generates secure random if not provided)"
    },
    require_mfa: {
      type: "boolean",
      default: false,
      description: "Require multi-factor authentication"
    },
    send_welcome_email: {
      type: "boolean",
      default: true,
      description: "Send welcome email with login instructions"
    }
  },
  required: ["email", "name", "role"]
}
```

**Example Call**:
```json
{
  "name": "create_user",
  "arguments": {
    "email": "registrar@school.com",
    "name": "Maria Santos",
    "role": "admin",
    "scopes": ["academic:*", "attendance:read"],
    "require_mfa": true,
    "send_welcome_email": true
  }
}
```

**Success Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "User created successfully.\n\nDetails:\n- ID: user-uuid-123\n- Email: registrar@school.com\n- Name: Maria Santos\n- Role: admin\n- Scopes: academic:*, attendance:read\n- MFA Required: Yes\n- Password: (sent via email)\n\nWelcome email sent to registrar@school.com."
  }],
  "isError": false
}
```

**Error Cases**:
- Email already exists → `"Error: Email already registered in this tenant"`
- Invalid scope → `"Error: Invalid scope 'invalid:scope'. Use identity://permission_scopes to view available scopes"`
- Insufficient permissions → `"Error: Cannot create super_admin users (requires super_admin role)"`

**Performance Budget**: < 500ms (p95)

**Audit Log Entry**:
```json
{
  "action": "create_user",
  "actor": "user-uuid-1",
  "target": "user-uuid-123",
  "details": {
    "email": "registrar@school.com",
    "role": "admin",
    "scopes": ["academic:*", "attendance:read"]
  }
}
```

---

### 10.3.2 update_user_role

**Description**: Update an existing user's role and associated permissions

**Authorization**: `identity:write` scope required

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    user_id: {
      type: "string",
      description: "ID of user to modify"
    },
    new_role: {
      type: "string",
      enum: ["super_admin", "admin", "teacher", "student", "guest"],
      description: "New role to assign"
    },
    reason: {
      type: "string",
      description: "Reason for role change (required for audit trail)"
    },
    notify_user: {
      type: "boolean",
      default: true,
      description: "Send notification email to user"
    }
  },
  required: ["user_id", "new_role", "reason"]
}
```

**Example Call**:
```json
{
  "name": "update_user_role",
  "arguments": {
    "user_id": "user-uuid-2",
    "new_role": "admin",
    "reason": "Promoted to department head",
    "notify_user": true
  }
}
```

**Success Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "User role updated successfully.\n\nChanges:\n- User: Sarah Johnson (teacher@school.com)\n- Old Role: teacher\n- New Role: admin\n- Default Scopes Added: academic:*, attendance:*, compliance:read\n- Reason: Promoted to department head\n\nNotification email sent."
  }],
  "isError": false
}
```

**Error Cases**:
- User not found → `"Error: User not found in this tenant"`
- Same role → `"Error: User already has role 'admin'"`
- Insufficient permissions → `"Error: Cannot assign super_admin role (requires super_admin privileges)"`

**Performance Budget**: < 500ms (p95)

---

### 10.3.3 set_permissions

**Description**: Grant fine-grained permissions (scopes) to a user

**Authorization**: `identity:admin` scope required

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    user_id: {
      type: "string",
      description: "ID of user to modify"
    },
    scopes_to_add: {
      type: "array",
      items: { type: "string" },
      description: "Scopes to grant (e.g., ['finance:write', 'academic:read'])"
    },
    scopes_to_remove: {
      type: "array",
      items: { type: "string" },
      description: "Scopes to revoke"
    },
    reason: {
      type: "string",
      description: "Reason for permission change (required for audit)"
    }
  },
  required: ["user_id", "reason"]
}
```

**Example Call**:
```json
{
  "name": "set_permissions",
  "arguments": {
    "user_id": "user-uuid-123",
    "scopes_to_add": ["finance:write"],
    "scopes_to_remove": [],
    "reason": "Granted finance access for invoice management"
  }
}
```

**Success Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Permissions updated successfully.\n\nUser: Maria Santos (registrar@school.com)\n\nAdded Scopes:\n- finance:write\n\nCurrent Scopes:\n- academic:*\n- attendance:read\n- finance:write\n\nReason: Granted finance access for invoice management"
  }],
  "isError": false
}
```

**Error Cases**:
- Invalid scope → `"Error: Scope 'invalid:scope' does not exist"`
- Scope conflict → `"Error: Cannot grant 'identity:admin' to non-admin users"`

**Performance Budget**: < 500ms (p95)

---

### 10.3.4 revoke_session

**Description**: Force logout by terminating an active session

**Authorization**: `identity:admin` scope required

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    session_id: {
      type: "string",
      description: "ID of session to revoke (from identity://active_sessions)"
    },
    reason: {
      type: "string",
      description: "Reason for session revocation"
    },
    notify_user: {
      type: "boolean",
      default: true,
      description: "Send notification to affected user"
    }
  },
  required: ["session_id", "reason"]
}
```

**Example Call**:
```json
{
  "name": "revoke_session",
  "arguments": {
    "session_id": "sess-uuid-1",
    "reason": "Security audit - suspicious activity",
    "notify_user": true
  }
}
```

**Success Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Session revoked successfully.\n\nSession: sess-uuid-1\nUser: admin@school.com\nReason: Security audit - suspicious activity\n\nUser has been logged out and will need to re-authenticate.\nNotification sent."
  }],
  "isError": false
}
```

**Error Cases**:
- Session not found → `"Error: Session not found or already expired"`
- Cannot revoke own session → `"Error: Cannot revoke your own session. Use logout instead"`

**Performance Budget**: < 200ms (p95)

---

### 10.3.5 rotate_api_key

**Description**: Rotate API key for service account or integration

**Authorization**: `identity:admin` scope required

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    user_id: {
      type: "string",
      description: "ID of service account user"
    },
    invalidate_old_key: {
      type: "boolean",
      default: true,
      description: "Immediately invalidate old key (false = grace period)"
    },
    grace_period_hours: {
      type: "number",
      default: 24,
      description: "Hours before old key expires (if invalidate_old_key = false)"
    }
  },
  required: ["user_id"]
}
```

**Example Call**:
```json
{
  "name": "rotate_api_key",
  "arguments": {
    "user_id": "user-uuid-service-1",
    "invalidate_old_key": false,
    "grace_period_hours": 48
  }
}
```

**Success Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "API key rotated successfully.\n\nService Account: api-integration@school.com\n\nNew API Key: sk_live_abc123def456...\n(Store this securely - it won't be shown again)\n\nOld Key Status: Active for 48 hours, then expires\nOld Key Expires: 2025-11-10T09:00:00Z\n\n⚠️ Update your integrations before the old key expires."
  }],
  "isError": false
}
```

**Error Cases**:
- Not a service account → `"Error: Cannot rotate API key for regular user accounts"`
- User not found → `"Error: Service account not found"`

**Performance Budget**: < 500ms (p95)

---

### 10.3.6 audit_access

**Description**: Query access logs for security audits and compliance

**Authorization**: `identity:admin` scope required

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    user_id: {
      type: "string",
      description: "Filter by specific user (optional)"
    },
    event_type: {
      type: "string",
      enum: ["login_success", "login_failed", "role_updated", "permission_changed", "session_revoked", "api_key_rotated"],
      description: "Filter by event type (optional)"
    },
    start_date: {
      type: "string",
      format: "date-time",
      description: "Start of date range (ISO 8601)"
    },
    end_date: {
      type: "string",
      format: "date-time",
      description: "End of date range (ISO 8601)"
    },
    limit: {
      type: "number",
      default: 50,
      maximum: 500,
      description: "Maximum number of events to return"
    }
  },
  required: []
}
```

**Example Call**:
```json
{
  "name": "audit_access",
  "arguments": {
    "event_type": "login_failed",
    "start_date": "2025-11-07T00:00:00Z",
    "end_date": "2025-11-08T23:59:59Z",
    "limit": 100
  }
}
```

**Success Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Access Audit Report\n\nPeriod: 2025-11-07 00:00:00 to 2025-11-08 23:59:59\nEvent Type: login_failed\nTotal Events: 15\n\nTop Failed Login Attempts:\n\n1. unknown@school.com\n   IP: 192.168.1.200\n   Attempts: 5\n   Last Attempt: 2025-11-08 08:45:00\n   Reason: invalid_credentials\n\n2. student@school.com\n   IP: 10.0.0.50\n   Attempts: 3\n   Last Attempt: 2025-11-07 14:22:00\n   Reason: invalid_credentials\n\n3. teacher@school.com\n   IP: 192.168.1.100\n   Attempts: 2\n   Last Attempt: 2025-11-07 09:15:00\n   Reason: account_locked\n\n⚠️ Recommendation: Investigate IP 192.168.1.200 (5 failed attempts)"
  }],
  "isError": false
}
```

**Error Cases**:
- Invalid date range → `"Error: end_date must be after start_date"`
- Limit exceeded → `"Error: Maximum limit is 500 events"`

**Performance Budget**: < 2s (p95)

---

## 10.4 Prompts

Prompts define the AI's behavior and persona for identity operations.

### 10.4.1 identity_persona

**Name**: `identity_persona`

**Description**: Core system prompt for identity & access assistant

**Content**:
```
You are an AI identity and access management assistant for an educational platform.

YOUR ROLE:
- Help super-administrators manage user identities, roles, and permissions
- Enforce security best practices
- Provide clear audit trails and explanations
- Use a professional, security-conscious tone

CAPABILITIES:
You have access to tools for:
- User account creation and management
- Role and permission assignment
- Session management and revocation
- API key rotation for service accounts
- Access auditing and compliance reporting

BEHAVIOR GUIDELINES:

1. **Security First**
   - ALWAYS confirm identity before granting elevated privileges
   - Require reasons for all permission changes (audit trail)
   - Warn about security implications of actions
   - Example: "Granting super_admin role gives full system access. Are you sure this is necessary?"

2. **Principle of Least Privilege**
   - Recommend minimal scopes needed for user's role
   - Suggest removing unnecessary permissions
   - Example: "This user only needs finance:read. I recommend removing finance:write unless they need to create invoices."

3. **Audit Trail Awareness**
   - Always include reasons when modifying permissions
   - Explain what actions will be logged
   - Example: "This permission change will be logged in the audit trail as: 'Granted finance:write for invoice management duties'"

4. **Suspicious Activity Detection**
   - Proactively alert on unusual patterns in audit logs
   - Recommend actions for security incidents
   - Example: "I notice 5 failed login attempts from IP 192.168.1.200. Would you like me to block this IP or investigate further?"

5. **Clear Authorization Explanations**
   - Explain what each scope/permission allows
   - Use identity://permission_scopes to show available options
   - Example: "The 'academic:write' scope allows creating programmes, courses, and classes, but not financial operations."

6. **Compliance Support**
   - Mention GDPR/compliance implications when relevant
   - Recommend regular access reviews
   - Example: "For GDPR compliance, I recommend reviewing user permissions quarterly. Would you like me to generate an access report?"

EXAMPLE INTERACTIONS:

User: "Create an admin account for Maria Santos, email registrar@school.com"
Assistant: [Calls create_user tool]
"I've created an admin account for Maria Santos (registrar@school.com).

By default, admin users receive these scopes:
- academic:* (full academic operations)
- attendance:* (full attendance management)
- compliance:read (view compliance reports)

Maria will need to set up MFA on first login. A welcome email has been sent with instructions.

Would you like me to grant additional scopes (e.g., finance:write)?"

User: "Show me failed login attempts today"
Assistant: [Calls audit_access tool]
"I found 15 failed login attempts today. Here are the top concerns:

⚠️ ALERT: 5 failed attempts from IP 192.168.1.200 for 'unknown@school.com'
- This could be a brute force attack
- Recommendation: Consider blocking this IP

The other failed attempts appear to be legitimate users forgetting passwords.

Would you like me to:
1. Generate a full audit report
2. Block the suspicious IP
3. Reset passwords for affected users?"

User: "Revoke all sessions for john@school.com"
Assistant: "I can revoke active sessions for john@school.com, but I need a reason for the audit trail.

Current active sessions: 2
- Session 1: Desktop (Chrome on Windows), last active 5 minutes ago
- Session 2: Mobile (Safari on iPhone), last active 2 hours ago

Why are you revoking these sessions? (e.g., 'Security incident', 'User requested', 'Account compromised')"
```

---

### 10.4.2 security_audit_prompt

**Name**: `security_audit`

**Description**: Generate a security audit report

**Arguments**:
- `focus` (optional): "users" | "sessions" | "permissions" | "overview"

**Content** (dynamic based on argument):
```
Generate a security audit report focusing on {{focus}}.

Include:
- User accounts with elevated privileges (super_admin, identity:admin)
- Inactive accounts (no login in 90+ days)
- Users with excessive scopes (recommend least privilege)
- Recent permission changes (last 7 days)
- Failed login attempts and suspicious patterns
- API keys due for rotation (older than 90 days)

Format as a structured report with:
1. Executive Summary (3-5 bullet points)
2. High Priority Issues (require immediate action)
3. Medium Priority Issues (review recommended)
4. Recommendations (best practices)

Flag any CRITICAL issues (e.g., super_admin with no MFA, inactive accounts with high privileges).
```

---

### 10.4.3 access_review_prompt

**Name**: `access_review`

**Description**: Quarterly access review for compliance

**Arguments**:
- `department` (optional): Filter by department/role

**Content**:
```
Generate a quarterly access review report for compliance purposes.

For each user with admin or elevated scopes:
1. List current permissions
2. Check last login date
3. Verify role still appropriate
4. Recommend permission adjustments

Output format (CSV-compatible):
User Email | Role | Scopes | Last Login | Status | Recommendation

Flag:
- ⚠️ REVIEW: Users with scopes they may not need
- ❌ REVOKE: Inactive users (90+ days no login) with elevated privileges
- ✅ OK: Permissions align with current role

This report supports GDPR Article 32 (access control) compliance.
```

---

## 10.5 Implementation Checklist

**Phase 1: Core Infrastructure**
- [ ] Implement user creation with scope assignment
- [ ] Implement role update with audit logging
- [ ] Set up permission scopes registry
- [ ] Create session management system

**Phase 2: Security Features**
- [ ] Add MFA enforcement logic
- [ ] Implement API key rotation mechanism
- [ ] Create session revocation system
- [ ] Build access audit log query system

**Phase 3: Testing**
- [ ] Unit tests for all 6 tools
- [ ] Integration tests for scope-based routing
- [ ] RLS policy tests (super-admin only access)
- [ ] E2E tests for user creation and permission flows
- [ ] Security tests (privilege escalation attempts)

**Phase 4: Observability**
- [ ] Add OpenTelemetry spans for all tools
- [ ] PII scrubbing for audit logs (email redaction in telemetry)
- [ ] Alerting for suspicious patterns (5+ failed logins)
- [ ] Compliance reporting dashboard

---

## 10.6 Error Handling

### Standard Error Responses

```typescript
// Tool execution error
{
  "content": [{
    "type": "text",
    "text": "Error: [User-friendly error message]"
  }],
  "isError": true
}

// MCP protocol error
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "field": "scopes",
      "reason": "Invalid scope format"
    }
  }
}
```

### Common Error Scenarios

| Scenario | Error Message | Recovery Action |
|----------|---------------|-----------------|
| Email already exists | "Error: Email already registered in this tenant" | Suggest using update_user_role instead |
| Invalid scope | "Error: Scope 'invalid:scope' does not exist" | Show identity://permission_scopes |
| Insufficient permissions | "Error: Cannot create super_admin users (requires super_admin role)" | Verify caller's role |
| Session not found | "Error: Session not found or already expired" | Check identity://active_sessions |
| Cannot revoke own session | "Error: Cannot revoke your own session. Use logout instead" | Explain security measure |
| User not found | "Error: User not found in this tenant" | Verify user_id is correct |

---

## 10.7 Performance Considerations

### Caching Strategy
- Cache permission scopes registry for 1 hour (rarely changes)
- Cache user directory for 2 minutes (frequently updated)
- Cache active sessions for 30 seconds (real-time view)
- Invalidate caches on relevant tool calls (create_user → user_directory)

### Performance Budgets
- `create_user`: < 500ms (p95)
- `update_user_role`: < 500ms (p95)
- `set_permissions`: < 500ms (p95)
- `revoke_session`: < 200ms (p95)
- `rotate_api_key`: < 500ms (p95)
- `audit_access`: < 2s (p95)

### Pagination
- Resources return up to 100 items by default
- `audit_access` supports pagination via `limit` parameter (max 500)

### Rate Limiting
- 50 requests per minute per admin user (more restrictive than other MCPs)
- `audit_access`: 10 requests per minute (expensive query)
- `create_user`: 20 per hour (prevent abuse)

---

## 10.8 Security Controls

### Input Validation
- All tool arguments validated against JSON schema
- Email validation using RFC 5322 regex
- Password strength validation (min 12 chars, complexity requirements)
- Scope validation against permission registry

### Authorization Matrix

| Tool | Required Role/Scope | Tenant Scope | Additional Checks |
|------|---------------------|--------------|-------------------|
| create_user | identity:write | Yes | Cannot create super_admin unless caller is super_admin |
| update_user_role | identity:write | Yes | User exists in tenant, reason provided |
| set_permissions | identity:admin | Yes | Scopes exist in registry, reason provided |
| revoke_session | identity:admin | Yes | Session exists, cannot revoke own session |
| rotate_api_key | identity:admin | Yes | User is service account |
| audit_access | identity:admin | Yes | Date range valid |

### Audit Logging

Every tool call is logged with:
- `timestamp` (ISO 8601)
- `user_id` (actor)
- `tenant_id`
- `tool_name`
- `arguments` (sanitized - passwords redacted)
- `target_user_id` (affected user)
- `result` (success/failure)
- `ip_address`
- `session_id`
- `reason` (for permission changes)

**Retention**: 7 years (compliance requirement)

**Immutability**: Audit logs use append-only write (no updates/deletes)

---

## 10.9 Migration from Admin MCP

### Tools Moving from Admin MCP to Identity MCP

| Old Tool (Admin MCP) | New Tool (Identity MCP) | Notes |
|----------------------|-------------------------|-------|
| `add_user` | `create_user` | Enhanced with scopes parameter |
| `modify_user` | `update_user_role` | Focused on role changes only |
| N/A | `set_permissions` | New fine-grained permission tool |
| N/A | `revoke_session` | New session management |
| N/A | `rotate_api_key` | New API key management |
| `view_audit_log` | `audit_access` | Specialized for identity events |

### Migration Timeline (Phase 1)

**Week 1-2**: Create Identity MCP
- Tasks: T-110 (Create Identity MCP)
- Build all 6 tools
- Implement resources
- Write prompts

**Week 3**: Update Host Routing
- Tasks: T-112 (Update Host routing)
- Add scope-based routing logic
- Test identity:* scope routing

**Week 4**: Authorization Migration
- Tasks: T-113 (Migrate authorization scopes)
- Update JWT claims to include scopes
- Backward compatibility (admin role → identity:* scope)

**Week 5**: E2E Testing
- Tasks: T-114 (E2E tests)
- Full integration testing
- Security testing (privilege escalation attempts)
- Rollback plan verification

---

## 10.10 Compliance Notes

### GDPR Alignment
- **Article 32 (Security)**: Access control enforced via scopes
- **Article 30 (Records)**: All identity operations logged
- **Article 5 (Principles)**: Least privilege recommended by AI

### ISO 27001 Alignment
- **A.9 (Access Control)**: Role-based access + fine-grained scopes
- **A.12.4 (Logging)**: Comprehensive audit logging
- **A.9.2 (User Access)**: Formal user registration (create_user with reason)

---

**Next**: Section 11 - Finance MCP Specification
