/**
 * Database Client
 * Drizzle ORM connection to PostgreSQL/Supabase
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create PostgreSQL connection
const connectionString = process.env.DATABASE_URL;

// For query purposes
const queryClient = postgres(connectionString);

// Create Drizzle instance
export const db = drizzle(queryClient, { schema });

// Export schema for use in other files
export { schema };

// Type exports
export type Database = typeof db;
