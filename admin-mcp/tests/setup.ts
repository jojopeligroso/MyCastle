/**
 * Test Setup and Utilities
 * Sets up test environment, mocks, and helper functions
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as jose from 'jose';

// Test environment configuration
export const TEST_ENV = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key',
  JWKS_URI: process.env.JWKS_URI || 'http://localhost:54321/.well-known/jwks.json',
  JWT_AUDIENCE: 'admin-mcp',
  TENANT_ID: 'test-tenant-123',
};

// Mock user contexts
export const MOCK_USERS = {
  admin: {
    id: 'admin-user-123',
    email: 'admin@test.com',
    role: 'admin',
    tenant_id: TEST_ENV.TENANT_ID,
    scopes: ['admin.super'],
  },
  teacher: {
    id: 'teacher-user-456',
    email: 'teacher@test.com',
    role: 'teacher',
    tenant_id: TEST_ENV.TENANT_ID,
    scopes: ['teacher.read.classes', 'teacher.write.attendance'],
  },
  student: {
    id: 'student-user-789',
    email: 'student@test.com',
    role: 'student',
    tenant_id: TEST_ENV.TENANT_ID,
    scopes: ['student.read.own'],
  },
  unauthorized: {
    id: 'unauthorized-user-000',
    email: 'unauthorized@test.com',
    role: 'student',
    tenant_id: 'different-tenant-456',
    scopes: [],
  },
};

// JWT signing key for tests
let testPrivateKey: jose.KeyLike;
let testPublicKey: jose.KeyLike;

/**
 * Generate test RSA key pair
 */
async function generateTestKeys() {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
  testPrivateKey = privateKey;
  testPublicKey = publicKey;
}

/**
 * Generate a valid JWT for testing
 */
export async function generateTestJWT(user: typeof MOCK_USERS.admin): Promise<string> {
  if (!testPrivateKey) {
    await generateTestKeys();
  }

  const jwt = await new jose.SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    tenant_id: user.tenant_id,
    scopes: user.scopes,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer('test-issuer')
    .setAudience(TEST_ENV.JWT_AUDIENCE)
    .setExpirationTime('1h')
    .sign(testPrivateKey);

  return jwt;
}

/**
 * Create a test Supabase client
 */
export function createTestSupabaseClient(jwt?: string): SupabaseClient {
  const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {};

  return createClient(
    TEST_ENV.SUPABASE_URL,
    TEST_ENV.SUPABASE_SERVICE_ROLE_KEY,
    {
      global: { headers },
    }
  );
}

/**
 * Clean up test data from database
 */
export async function cleanupTestData(supabase: SupabaseClient, tables: string[]) {
  for (const table of tables) {
    await supabase
      .from(table)
      .delete()
      .eq('tenant_id', TEST_ENV.TENANT_ID);
  }
}

/**
 * Seed test data
 */
export async function seedTestData(supabase: SupabaseClient) {
  // Seed test tenant
  await supabase.from('tenants').upsert({
    id: TEST_ENV.TENANT_ID,
    name: 'Test School',
    slug: 'test-school',
    timezone: 'Europe/London',
  });

  // Seed test users
  for (const user of Object.values(MOCK_USERS)) {
    await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      name: user.email.split('@')[0],
      role: user.role,
      tenant_id: user.tenant_id,
      status: 'active',
    });
  }

  // Seed test class
  await supabase.from('classes').upsert({
    id: 'test-class-123',
    name: 'Test Class A1',
    tenant_id: TEST_ENV.TENANT_ID,
    level: 'A1',
    status: 'active',
  });

  // Seed test enrollment
  await supabase.from('enrollments').upsert({
    id: 'test-enrollment-123',
    student_id: MOCK_USERS.student.id,
    class_id: 'test-class-123',
    tenant_id: TEST_ENV.TENANT_ID,
    status: 'active',
  });
}

/**
 * Mock MCP request context
 */
export interface MockMCPRequest {
  method: string;
  params: {
    name?: string;
    arguments?: Record<string, unknown>;
    uri?: string;
    headers?: {
      authorization?: string;
    };
  };
}

/**
 * Create a mock MCP tool request
 */
export function createMockToolRequest(
  toolName: string,
  args: Record<string, unknown>,
  jwt?: string
): MockMCPRequest {
  return {
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
      headers: {
        authorization: jwt ? `Bearer ${jwt}` : undefined,
      },
    },
  };
}

/**
 * Create a mock MCP resource request
 */
export function createMockResourceRequest(
  uri: string,
  jwt?: string
): MockMCPRequest {
  return {
    method: 'resources/read',
    params: {
      uri,
      headers: {
        authorization: jwt ? `Bearer ${jwt}` : undefined,
      },
    },
  };
}

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  await generateTestKeys();
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
});

// Per-test setup
beforeEach(async () => {
  // Can be used to seed fresh data before each test
});

afterEach(async () => {
  // Can be used to cleanup after each test
});

export { testPublicKey };
