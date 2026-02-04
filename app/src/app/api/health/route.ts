/**
 * Health Check API Endpoint
 * Validates that the application infrastructure is working correctly
 *
 * Checks:
 * - Database connectivity
 * - RLS session variable support
 * - Environment configuration
 *
 * Returns:
 * - 200 OK: All systems operational
 * - 503 Service Unavailable: Critical infrastructure failure
 */

import { NextResponse } from 'next/server';
import { db, validateRLSSupport } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  const checks = {
    database: 'unknown' as 'ok' | 'failed',
    rls_support: 'unknown' as 'ok' | 'failed',
    environment: 'unknown' as 'ok' | 'warning' | 'failed',
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check 1: Basic database connectivity
    try {
      await db.execute(sql`SELECT 1 as health_check`);
      checks.database = 'ok';
    } catch (error) {
      checks.database = 'failed';
      errors.push(
        `Database connection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Check 2: RLS session variable support
    try {
      await validateRLSSupport();
      checks.rls_support = 'ok';
    } catch (error) {
      checks.rls_support = 'failed';
      errors.push(
        `RLS validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Check 3: Environment configuration
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || '';

    if (connectionString.includes(':6543')) {
      checks.environment = 'failed';
      errors.push(
        'Using Transaction Mode Pooler (port 6543) which does not support RLS session variables'
      );
    } else if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
      checks.environment = 'warning';
      warnings.push('DIRECT_URL not set, using DATABASE_URL (may cause RLS issues)');
    } else if (process.env.DIRECT_URL) {
      checks.environment = 'ok';
    } else {
      checks.environment = 'failed';
      errors.push('No database connection string configured');
    }

    // Determine overall health status
    const isHealthy = checks.database === 'ok' && checks.rls_support === 'ok';

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      environment: {
        node_env: process.env.NODE_ENV,
        has_direct_url: !!process.env.DIRECT_URL,
        has_database_url: !!process.env.DATABASE_URL,
      },
    };

    if (!isHealthy) {
      return NextResponse.json(response, { status: 503 });
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Catch-all for unexpected errors
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks,
        errors: [`Unexpected error: ${error instanceof Error ? error.message : String(error)}`],
      },
      { status: 503 }
    );
  }
}
