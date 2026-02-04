/**
 * Database Client
 * Drizzle ORM connection to PostgreSQL/Supabase
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Load environment variables from .env.local if not already loaded
if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  config({ path: resolve(__dirname, '../../.env.local') });
}

// Use DIRECT_URL for session variable support (RLS context)
// Falls back to DATABASE_URL if DIRECT_URL is not set
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DIRECT_URL or DATABASE_URL environment variable must be set');
}

// For query purposes
const queryClient = postgres(connectionString);

// Create Drizzle instance
export const db = drizzle(queryClient, { schema });

// Export schema for use in other files
export { schema };

// Type exports
export type Database = typeof db;
