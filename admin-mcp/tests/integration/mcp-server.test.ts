/**
 * Integration Tests for MCP Server
 */

import { describe, it, expect } from 'vitest';
import { generateTestJWT, MOCK_USERS } from '../setup';

describe('MCP Server Integration', () => {
  it('should generate test JWT', async () => {
    const jwt = await generateTestJWT(MOCK_USERS.admin);
    expect(jwt).toBeDefined();
    expect(typeof jwt).toBe('string');
  });

  it('should have admin user configured', () => {
    expect(MOCK_USERS.admin.role).toBe('admin');
    expect(MOCK_USERS.admin.scopes).toContain('admin.super');
  });
});
