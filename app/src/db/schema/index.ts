/**
 * Database Schema Index
 * Exports all schema tables for Drizzle ORM
 * Updated: 2026-01-13 - Fresh schema aligned with database
 */

// Core tables (UPDATED - matches fresh database)
export * from './core';

// Business tables (NEW - Ireland ESL school logic)
export * from './business';

// Academic schema (uncommented - classes, enrollments, attendance are actively used)
export * from './academic';

// System schema (audit logs, invoices, exports)
export * from './system';

// Programmes schema
export * from './programmes';

// Facilities schema (rooms and allocations)
export * from './facilities';

// Old schemas - commenting out until updated to match new database
// export * from './curriculum';
