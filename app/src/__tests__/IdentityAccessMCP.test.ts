/**
 * Identity & Access MCP Tests
 * Tests for the Identity & Access MCP server
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { identityAccessMCPConfig } from '../lib/mcp/servers/identity/IdentityAccessMCP';
import { MCPSession } from '../lib/mcp/types';

describe('Identity & Access MCP', () => {
  let mockSession: MCPSession;

  beforeEach(() => {
    mockSession = {
      sessionId: 'test-session-123',
      userId: 'test-user-123',
      tenantId: 'test-tenant-123',
      role: 'super_admin',
      scopes: ['identity:*'],
      expiresAt: new Date(Date.now() + 3600 * 1000),
      metadata: {
        email: 'admin@test.com',
        name: 'Test Admin',
      },
    };
  });

  describe('MCP Configuration', () => {
    it('should have correct server identity', () => {
      expect(identityAccessMCPConfig.name).toBe('Identity & Access MCP');
      expect(identityAccessMCPConfig.version).toBe('3.0.0');
      expect(identityAccessMCPConfig.scopePrefix).toBe('identity');
    });

    it('should have exactly 6 tools', () => {
      expect(identityAccessMCPConfig.tools).toHaveLength(6);

      const toolNames = identityAccessMCPConfig.tools.map(t => t.name);
      expect(toolNames).toContain('create_user');
      expect(toolNames).toContain('update_user_role');
      expect(toolNames).toContain('set_permissions');
      expect(toolNames).toContain('revoke_session');
      expect(toolNames).toContain('rotate_api_key');
      expect(toolNames).toContain('audit_access');
    });

    it('should have exactly 4 resources', () => {
      expect(identityAccessMCPConfig.resources).toHaveLength(4);

      const resourceUris = identityAccessMCPConfig.resources.map(r => r.uri);
      expect(resourceUris).toContain('identity://user_directory');
      expect(resourceUris).toContain('identity://active_sessions');
      expect(resourceUris).toContain('identity://access_audit_log');
      expect(resourceUris).toContain('identity://permission_scopes');
    });

    it('should have exactly 3 prompts', () => {
      expect(identityAccessMCPConfig.prompts).toHaveLength(3);

      const promptNames = identityAccessMCPConfig.prompts.map(p => p.name);
      expect(promptNames).toContain('identity_persona');
      expect(promptNames).toContain('security_audit');
      expect(promptNames).toContain('access_review');
    });
  });

  describe('Tool Scopes', () => {
    it('create_user should require identity:write scope', () => {
      const tool = identityAccessMCPConfig.tools.find(t => t.name === 'create_user');
      expect(tool?.requiredScopes).toContain('identity:write');
    });

    it('update_user_role should require identity:write scope', () => {
      const tool = identityAccessMCPConfig.tools.find(t => t.name === 'update_user_role');
      expect(tool?.requiredScopes).toContain('identity:write');
    });

    it('set_permissions should require identity:admin scope', () => {
      const tool = identityAccessMCPConfig.tools.find(t => t.name === 'set_permissions');
      expect(tool?.requiredScopes).toContain('identity:admin');
    });

    it('revoke_session should require identity:admin scope', () => {
      const tool = identityAccessMCPConfig.tools.find(t => t.name === 'revoke_session');
      expect(tool?.requiredScopes).toContain('identity:admin');
    });

    it('rotate_api_key should require identity:admin scope', () => {
      const tool = identityAccessMCPConfig.tools.find(t => t.name === 'rotate_api_key');
      expect(tool?.requiredScopes).toContain('identity:admin');
    });

    it('audit_access should require identity:admin scope', () => {
      const tool = identityAccessMCPConfig.tools.find(t => t.name === 'audit_access');
      expect(tool?.requiredScopes).toContain('identity:admin');
    });
  });

  describe('Resources', () => {
    it('user_directory should require identity:read scope', () => {
      const resource = identityAccessMCPConfig.resources.find(r => r.uri === 'identity://user_directory');
      expect(resource?.requiredScopes).toContain('identity:read');
    });

    it('active_sessions should require identity:read scope', () => {
      const resource = identityAccessMCPConfig.resources.find(r => r.uri === 'identity://active_sessions');
      expect(resource?.requiredScopes).toContain('identity:read');
    });

    it('access_audit_log should require identity:admin scope', () => {
      const resource = identityAccessMCPConfig.resources.find(r => r.uri === 'identity://access_audit_log');
      expect(resource?.requiredScopes).toContain('identity:admin');
    });

    it('permission_scopes should have no required scopes', () => {
      const resource = identityAccessMCPConfig.resources.find(r => r.uri === 'identity://permission_scopes');
      expect(resource?.requiredScopes).toEqual([]);
    });
  });

  describe('Prompts', () => {
    it('identity_persona should be available to all users', () => {
      const prompt = identityAccessMCPConfig.prompts.find(p => p.name === 'identity_persona');
      expect(prompt?.requiredScopes).toEqual([]);
    });

    it('security_audit should require identity:admin scope', () => {
      const prompt = identityAccessMCPConfig.prompts.find(p => p.name === 'security_audit');
      expect(prompt?.requiredScopes).toContain('identity:admin');
    });

    it('access_review should require identity:admin scope', () => {
      const prompt = identityAccessMCPConfig.prompts.find(p => p.name === 'access_review');
      expect(prompt?.requiredScopes).toContain('identity:admin');
    });
  });

  describe('MCP Best Practices Compliance', () => {
    it('should comply with ≤10 tools limit (has 6)', () => {
      expect(identityAccessMCPConfig.tools.length).toBeLessThanOrEqual(10);
    });

    it('all tools should have input schemas', () => {
      identityAccessMCPConfig.tools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
      });
    });

    it('all tools should have descriptions', () => {
      identityAccessMCPConfig.tools.forEach(tool => {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });

    it('all resources should have URIs', () => {
      identityAccessMCPConfig.resources.forEach(resource => {
        expect(resource.uri).toBeDefined();
        expect(resource.uri).toMatch(/^identity:\/\//);
      });
    });

    it('all prompts should have templates', () => {
      identityAccessMCPConfig.prompts.forEach(prompt => {
        expect(prompt.template).toBeDefined();
        expect(prompt.template.length).toBeGreaterThan(100);
      });
    });
  });
});
