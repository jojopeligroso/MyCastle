/**
 * Context Aggregation
 * Aggregates resources from MCP servers to provide context to LLMs
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  tenant_id: string;
  scopes: string[];
  jwt: string;
}

export interface AggregatedContext {
  role: string;
  resources: Record<string, any>;
  metadata: {
    user_id: string;
    tenant_id: string;
    timestamp: string;
  };
}

/**
 * Aggregate context from MCP resources for LLM consumption
 */
export class ContextAggregator {
  /**
   * Aggregate context based on user role
   */
  async aggregateContext(
    client: Client,
    user: User,
    message?: string
  ): Promise<AggregatedContext> {
    switch (user.role) {
      case 'admin':
        return await this.aggregateAdminContext(client, user);
      case 'teacher':
        return await this.aggregateTeacherContext(client, user);
      case 'student':
        return await this.aggregateStudentContext(client, user);
      default:
        throw new Error(`Unknown user role: ${user.role}`);
    }
  }

  /**
   * Aggregate context for admin users
   */
  private async aggregateAdminContext(
    client: Client,
    user: User
  ): Promise<AggregatedContext> {
    console.log(`[Context] Aggregating admin context for ${user.email}`);

    // Fetch admin-relevant resources in parallel
    const [users, classes, systemStatus] = await Promise.allSettled([
      this.readResource(client, 'mcp://admin/users', user),
      this.readResource(client, 'mcp://admin/classes', user),
      this.readResource(client, 'mcp://admin/system-status', user),
    ]);

    return {
      role: 'admin',
      resources: {
        users: this.extractData(users),
        classes: this.extractData(classes),
        system_status: this.extractData(systemStatus),
      },
      metadata: {
        user_id: user.id,
        tenant_id: user.tenant_id,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Aggregate context for teacher users
   */
  private async aggregateTeacherContext(
    client: Client,
    user: User
  ): Promise<AggregatedContext> {
    console.log(`[Context] Aggregating teacher context for ${user.email}`);

    // Fetch teacher-relevant resources in parallel
    const [timetable, classes, materials] = await Promise.allSettled([
      this.readResource(client, 'teacher://my_timetable', user),
      this.readResource(client, 'teacher://my_classes', user),
      this.readResource(client, 'teacher://materials', user),
    ]);

    return {
      role: 'teacher',
      resources: {
        timetable: this.extractData(timetable),
        classes: this.extractData(classes),
        materials: this.extractData(materials),
      },
      metadata: {
        user_id: user.id,
        tenant_id: user.tenant_id,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Aggregate context for student users
   */
  private async aggregateStudentContext(
    client: Client,
    user: User
  ): Promise<AggregatedContext> {
    console.log(`[Context] Aggregating student context for ${user.email}`);

    // Fetch student-relevant resources in parallel
    const [profile, schedule, homework] = await Promise.allSettled([
      this.readResource(client, 'student://profile', user),
      this.readResource(client, 'student://schedule', user),
      this.readResource(client, 'student://homework', user),
    ]);

    return {
      role: 'student',
      resources: {
        profile: this.extractData(profile),
        schedule: this.extractData(schedule),
        homework: this.extractData(homework),
      },
      metadata: {
        user_id: user.id,
        tenant_id: user.tenant_id,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Read a resource from MCP server
   */
  private async readResource(
    client: Client,
    uri: string,
    user: User
  ): Promise<any> {
    try {
      const response = await client.readResource({
        uri,
        // Pass JWT in meta/headers if supported
        _meta: {
          headers: {
            authorization: `Bearer ${user.jwt}`,
          },
        },
      } as any);

      return response;
    } catch (error: any) {
      console.warn(`[Context] Failed to read resource ${uri}:`, error.message);
      return null;
    }
  }

  /**
   * Extract data from PromiseSettledResult
   */
  private extractData(result: PromiseSettledResult<any>): any {
    if (result.status === 'fulfilled' && result.value) {
      // Parse resource contents
      try {
        if (result.value.contents && result.value.contents.length > 0) {
          const content = result.value.contents[0];
          if (content.text) {
            return JSON.parse(content.text);
          }
        }
      } catch (error) {
        console.warn('[Context] Failed to parse resource content:', error);
      }
      return result.value;
    }
    return null;
  }

  /**
   * Build context string for LLM
   */
  buildContextString(context: AggregatedContext): string {
    const parts: string[] = [];

    parts.push(`# User Context`);
    parts.push(`Role: ${context.role}`);
    parts.push(`User ID: ${context.metadata.user_id}`);
    parts.push(`Tenant ID: ${context.metadata.tenant_id}`);
    parts.push('');

    parts.push(`# Available Resources`);

    for (const [key, value] of Object.entries(context.resources)) {
      if (value) {
        parts.push(`## ${key}`);
        parts.push('```json');
        parts.push(JSON.stringify(value, null, 2));
        parts.push('```');
        parts.push('');
      }
    }

    return parts.join('\n');
  }
}

export const contextAggregator = new ContextAggregator();
