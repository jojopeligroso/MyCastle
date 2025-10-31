/**
 * MCP Resources Module
 *
 * This module exports all read-only resources for the Admin MCP server.
 * Resources provide structured data access with ETag support for caching.
 */

// Export all resource modules
export * from './weekly-ops.js';
export * from './ar-aging.js';
export * from './users-directory.js';
export * from './class-load.js';
export * from './compliance.js';
export * from './accommodation.js';
export * from './registers.js';
export * from './audit-rollup.js';

// Import metadata for registry
import { weeklyOpsMetadata } from './weekly-ops.js';
import { arAgingMetadata } from './ar-aging.js';
import { usersDirectoryMetadata } from './users-directory.js';
import { classLoadMetadata } from './class-load.js';
import { visaExpiriesMetadata } from './compliance.js';
import { accommodationOccupancyMetadata } from './accommodation.js';
import { registerMetadata } from './registers.js';
import { auditRollupMetadata } from './audit-rollup.js';

import type { MCPResource } from '../../types/index.js';

/**
 * Registry of all available resources
 * Used for resource discovery and validation
 */
export const resourceRegistry: MCPResource[] = [
  weeklyOpsMetadata,
  arAgingMetadata,
  usersDirectoryMetadata,
  classLoadMetadata,
  visaExpiriesMetadata,
  accommodationOccupancyMetadata,
  registerMetadata,
  auditRollupMetadata,
];

/**
 * Get resource metadata by URI
 */
export function getResourceByUri(uri: string): MCPResource | undefined {
  return resourceRegistry.find(resource => {
    // Handle URIs with path parameters (e.g., {class_id}, {iso_week})
    const pattern = resource.uri.replace(/\{[^}]+\}/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(uri);
  });
}

/**
 * Check if a URI is a valid resource
 */
export function isValidResourceUri(uri: string): boolean {
  return getResourceByUri(uri) !== undefined;
}

/**
 * Get all resource URIs
 */
export function getAllResourceUris(): string[] {
  return resourceRegistry.map(resource => resource.uri);
}

/**
 * Get resources by category (based on URI path)
 */
export function getResourcesByCategory(category: string): MCPResource[] {
  return resourceRegistry.filter(resource =>
    resource.uri.includes(`/${category}/`)
  );
}

/**
 * Resource categories
 */
export const RESOURCE_CATEGORIES = {
  REPORTS: 'reports',
  FINANCE: 'finance',
  DIRECTORY: 'directory',
  COMPLIANCE: 'compliance',
  ACCOMMODATION: 'accommodation',
  REGISTERS: 'registers',
  AUDIT: 'audit',
} as const;

/**
 * Get resource statistics
 */
export function getResourceStats(): {
  total: number;
  byCategory: Record<string, number>;
} {
  const byCategory = Object.values(RESOURCE_CATEGORIES).reduce((acc, category) => {
    acc[category] = getResourcesByCategory(category).length;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: resourceRegistry.length,
    byCategory,
  };
}
