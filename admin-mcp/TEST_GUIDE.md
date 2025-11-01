# Admin MCP Testing Guide

## Overview

Comprehensive testing strategy for the Admin MCP server covering unit tests, integration tests, and end-to-end testing.

## Test Structure

```
tests/
├── setup.ts                      # Test configuration and utilities
├── tools/                        # Unit tests for individual tools
│   ├── create-user.test.ts
│   ├── mark-attendance.test.ts
│   ├── assign-role.test.ts
│   └── create-class.test.ts
├── integration/                  # Integration tests
│   ├── mcp-server.test.ts       # MCP protocol tests
│   ├── auth-flow.test.ts        # Authentication flow
│   └── audit-logging.test.ts    # Audit trail verification
└── e2e/                         # End-to-end tests
    ├── user-management.test.ts  # Complete user workflows
    └── class-management.test.ts # Complete class workflows
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Specific Test File
```bash
npm test tests/tools/create-user.test.ts
```

### With Coverage
```bash
npm run test:coverage
```

### Integration Tests Only
```bash
npm test tests/integration
```

## Test Environment Setup

### Prerequisites

1. **Supabase Instance** (local or cloud)
   - Create test database
   - Apply schema migrations
   - Configure RLS policies

2. **Environment Variables**
   ```bash
   cp .env.example .env.test
   ```

   Update `.env.test`:
   ```env
   SUPABASE_URL=http://localhost:54321
   SUPABASE_ANON_KEY=your-test-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key
   JWKS_URI=http://localhost:54321/.well-known/jwks.json
   JWT_AUDIENCE=admin-mcp
   NODE_ENV=test
   ```

3. **Test Data**
   - Run `npm run seed:test` to populate test data
   - Or use fixtures from `tests/fixtures/`

## Test Categories

### 1. Unit Tests (`tests/tools/`)

Test individual tools in isolation with mocked dependencies.

**Coverage:**
- Input validation (Zod schemas)
- Authorization checks
- Business logic
- Error handling
- Audit logging

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { createUser } from '../../src/tools/create-user';
import { MOCK_USERS, generateTestJWT } from '../setup';

describe('create-user tool', () => {
  it('should validate email format', async () => {
    await expect(
      createUser.execute(
        { email: 'invalid', name: 'Test', role: 'student' },
        MOCK_USERS.admin
      )
    ).rejects.toThrow(/email/i);
  });
});
```

### 2. Integration Tests (`tests/integration/`)

Test interactions between components and external systems.

**Coverage:**
- MCP protocol compliance (JSON-RPC 2.0)
- Authentication flows
- Database operations
- Audit logging persistence
- Multi-tool workflows

**Example:**
```typescript
describe('MCP Server Integration', () => {
  it('should list available tools', async () => {
    const response = await sendMCPRequest({
      method: 'tools/list',
      params: { headers: { authorization: `Bearer ${jwt}` } }
    });

    expect(response.result.tools).toBeDefined();
  });
});
```

### 3. End-to-End Tests (`tests/e2e/`)

Test complete user workflows from start to finish.

**Coverage:**
- User management lifecycle
- Class creation and enrollment
- Attendance marking workflows
- Report generation

**Example:**
```typescript
describe('User Management Workflow', () => {
  it('should create user, assign role, and enroll in class', async () => {
    // 1. Create user
    const user = await createUser(...);

    // 2. Assign teacher role
    await assignRole(user.id, 'teacher');

    // 3. Assign to class
    await assignTeacher(user.id, classId);

    // 4. Verify in database
    const result = await fetchUser(user.id);
    expect(result.role).toBe('teacher');
  });
});
```

## Test Utilities

### Mock Users

Pre-configured user contexts for testing:

```typescript
import { MOCK_USERS } from './tests/setup';

// Admin with full permissions
MOCK_USERS.admin

// Teacher with limited permissions
MOCK_USERS.teacher

// Student with read-only access
MOCK_USERS.student

// Unauthorized user (different tenant)
MOCK_USERS.unauthorized
```

### JWT Generation

```typescript
import { generateTestJWT } from './tests/setup';

const adminJWT = await generateTestJWT(MOCK_USERS.admin);
```

### Supabase Client

```typescript
import { createTestSupabaseClient } from './tests/setup';

const supabase = createTestSupabaseClient(jwt);
```

### Test Data Cleanup

```typescript
import { cleanupTestData } from './tests/setup';

afterEach(async () => {
  await cleanupTestData(supabase, ['users', 'classes', 'attendance']);
});
```

### Mock MCP Requests

```typescript
import { createMockToolRequest, createMockResourceRequest } from './tests/setup';

const toolRequest = createMockToolRequest('create-user', { ... }, jwt);
const resourceRequest = createMockResourceRequest('admin://users', jwt);
```

## Coverage Goals

### Current Coverage
- **Overall**: ~30%
- **Tools**: ~60% (14/54 tools have tests)
- **Resources**: ~0%
- **Integration**: ~20%

### Target Coverage (MVP)
- **Overall**: 80%
- **Tools**: 90%
- **Resources**: 70%
- **Integration**: 80%

### Priority Test Areas
1. ✅ User management tools
2. ✅ Attendance tools
3. ⏳ Class management tools
4. ⏳ Authentication & authorization
5. ⏳ Audit logging
6. ❌ Resource handlers
7. ❌ Prompt templates

## Test Data Management

### Fixtures

Located in `tests/fixtures/`:
- `users.json` - Sample user data
- `classes.json` - Sample class data
- `sessions.json` - Sample session data

### Seeding Test Data

```bash
npm run seed:test
```

Or programmatically:
```typescript
import { seedTestData } from './tests/setup';

beforeAll(async () => {
  await seedTestData(supabase);
});
```

### Cleanup

```bash
npm run cleanup:test
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: supabase/postgres:15.1.0.117
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run build
      - run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Debugging Tests

### Run Single Test with Debug Output

```bash
DEBUG=* npm test tests/tools/create-user.test.ts
```

### VSCode Debug Configuration

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal"
}
```

### Inspect Test Database

```bash
# Connect to test database
psql $SUPABASE_URL

# Query test data
SELECT * FROM users WHERE tenant_id = 'test-tenant-123';
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up data after each test
- Don't rely on test execution order

### 2. Mock External Services
- Mock email sending
- Mock file storage
- Mock external APIs

### 3. Descriptive Test Names
```typescript
// ✅ Good
it('should reject user creation when email already exists', ...)

// ❌ Bad
it('test user creation', ...)
```

### 4. Arrange-Act-Assert Pattern
```typescript
it('should create user with valid data', async () => {
  // Arrange
  const userData = { email: 'test@example.com', ... };

  // Act
  const result = await createUser.execute(userData, admin);

  // Assert
  expect(result.success).toBe(true);
  expect(result.user.email).toBe('test@example.com');
});
```

### 5. Test Error Paths
```typescript
it('should handle database errors gracefully', async () => {
  // Simulate database error
  await expect(createUser.execute(invalidData, admin))
    .rejects.toThrow(/database error/i);
});
```

## Common Issues

### Issue: "Cannot find module"
**Solution**: Run `npm run build` before tests

### Issue: "JWKS fetch failed"
**Solution**: Ensure JWKS_URI is accessible or mock JWT verification

### Issue: "Database connection failed"
**Solution**: Verify Supabase is running and credentials are correct

### Issue: "Tests timeout"
**Solution**: Increase timeout in vitest.config.ts

## Next Steps

1. **Implement missing tests**
   - Create tests for remaining 40 tools
   - Add resource handler tests
   - Add prompt template tests

2. **Improve coverage**
   - Target 80% overall coverage
   - Focus on critical paths first

3. **Add performance tests**
   - Load testing for concurrent requests
   - Memory leak detection
   - Database query optimization

4. **Add security tests**
   - Penetration testing
   - Authorization bypass attempts
   - SQL injection attempts

---

**Last Updated**: 2025-11-01
**Test Framework**: Vitest
**Coverage Tool**: v8
