/**
 * Facilities Schema - Rooms and Room Allocations
 * Created: 2026-01-27
 * Ref: Task 1.8.1, 1.8.2, 1.8.3 - Rooms Management Module
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  integer,
  jsonb,
  index,
  uniqueIndex,
  boolean,
} from 'drizzle-orm/pg-core';
import { tenants, users } from './core';
import { classSessions } from './academic';

/**
 * Rooms Table
 * Physical classrooms and facilities with equipment/capacity tracking
 */
export const rooms = pgTable(
  'rooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Basic info
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // Capacity & features
    capacity: integer('capacity').notNull().default(20),
    equipment: jsonb('equipment').$type<Record<string, unknown>>().default({}), // {"projector": true, "computers": 15}
    facilities: jsonb('facilities').$type<string[]>().default([]), // ["wifi", "air_conditioning"]

    // Accessibility
    accessibility: boolean('accessibility').default(false),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('available'), // available, maintenance, unavailable

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  table => [
    index('idx_rooms_tenant').on(table.tenantId),
    index('idx_rooms_status').on(table.status),
    index('idx_rooms_capacity').on(table.capacity),
    uniqueIndex('uk_rooms_tenant_name').on(table.tenantId, table.name),
  ]
);

/**
 * Room Allocations Table
 * Links class sessions to specific rooms for scheduling
 */
export const roomAllocations = pgTable(
  'room_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // References
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    classSessionId: uuid('class_session_id')
      .notNull()
      .references(() => classSessions.id, { onDelete: 'cascade' }),

    // Allocation details
    allocatedBy: uuid('allocated_by').references(() => users.id),
    notes: text('notes'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_allocations_tenant').on(table.tenantId),
    index('idx_allocations_room').on(table.roomId),
    index('idx_allocations_session').on(table.classSessionId),
    uniqueIndex('uk_allocations_session').on(table.classSessionId), // One room per session
    index('idx_allocations_room_created').on(table.roomId, table.createdAt),
  ]
);

/**
 * Type exports for use in application code
 */
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type RoomAllocation = typeof roomAllocations.$inferSelect;
export type NewRoomAllocation = typeof roomAllocations.$inferInsert;
