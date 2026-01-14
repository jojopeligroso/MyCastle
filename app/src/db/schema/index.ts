/**
 * Database Schema Index
 * Exports all schema tables for Drizzle ORM
 * Updated: 2026-01-13 - Fresh schema aligned with database
 */

// Core tables (UPDATED - matches fresh database)
export * from './core';

// Business tables (NEW - Ireland ESL school logic)
export * from './business';

// Old schemas - commenting out until updated to match new database
// export * from './academic';
// export * from './curriculum';
// export * from './system';
// export * from './programmes';
