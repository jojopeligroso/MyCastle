-- Migration: FRESH_0014_rooms.sql
-- Purpose: Add rooms table for classroom and facility management
-- Date: 2026-01-27
-- Ref: Task 1.8.1, 1.8.2, 1.8.3 - Rooms Management Module

-- =====================================================================
-- Rooms Table
-- =====================================================================
-- Tracks physical classrooms and facilities with equipment/capacity info
-- Supports room allocation and booking for class sessions

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Basic info
  name VARCHAR(255) NOT NULL, -- e.g., "Room 101", "Computer Lab A"
  description TEXT, -- Additional details about the room

  -- Capacity & features
  capacity INTEGER NOT NULL DEFAULT 20, -- Maximum student capacity
  equipment JSONB DEFAULT '{}', -- {"projector": true, "computers": 15, "whiteboard": true}
  facilities JSONB DEFAULT '[]', -- ["wifi", "air_conditioning", "wheelchair_access"]

  -- Accessibility
  accessibility BOOLEAN DEFAULT false, -- Wheelchair accessible

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'available', -- available, maintenance, unavailable

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete support
);

-- =====================================================================
-- Room Allocations Table
-- =====================================================================
-- Links class sessions to specific rooms
-- Supports room booking and conflict detection

CREATE TABLE IF NOT EXISTS room_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- References
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,

  -- Allocation details
  allocated_by UUID REFERENCES users(id), -- Admin/teacher who made allocation
  notes TEXT, -- Special requirements or notes

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- Indexes
-- =====================================================================

-- Rooms indexes
CREATE INDEX idx_rooms_tenant ON rooms(tenant_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_capacity ON rooms(capacity);

-- Unique constraint: room name must be unique per tenant
CREATE UNIQUE INDEX uk_rooms_tenant_name ON rooms(tenant_id, name)
  WHERE deleted_at IS NULL;

-- Room allocations indexes
CREATE INDEX idx_allocations_tenant ON room_allocations(tenant_id);
CREATE INDEX idx_allocations_room ON room_allocations(room_id);
CREATE INDEX idx_allocations_session ON room_allocations(class_session_id);

-- Unique constraint: one room per session (prevent double-booking)
CREATE UNIQUE INDEX uk_allocations_session ON room_allocations(class_session_id);

-- Composite index for finding room availability by date/time (via session join)
CREATE INDEX idx_allocations_room_created ON room_allocations(room_id, created_at);

-- =====================================================================
-- RLS Policies
-- =====================================================================

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_allocations ENABLE ROW LEVEL SECURITY;

-- Rooms: Admin full access within their tenant
CREATE POLICY admin_rooms_full_access ON rooms
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Rooms: Teachers can view rooms in their tenant
CREATE POLICY teacher_rooms_read ON rooms
  FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Room Allocations: Admin full access within their tenant
CREATE POLICY admin_allocations_full_access ON room_allocations
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Room Allocations: Teachers can view allocations in their tenant
CREATE POLICY teacher_allocations_read ON room_allocations
  FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =====================================================================
-- Comments
-- =====================================================================
COMMENT ON TABLE rooms IS 'Physical classrooms and facilities with capacity and equipment tracking';
COMMENT ON TABLE room_allocations IS 'Links class sessions to specific rooms for scheduling';

COMMENT ON COLUMN rooms.name IS 'Room identifier (e.g., "Room 101", "Computer Lab A")';
COMMENT ON COLUMN rooms.capacity IS 'Maximum student capacity';
COMMENT ON COLUMN rooms.equipment IS 'JSONB object describing available equipment (projector, computers, etc.)';
COMMENT ON COLUMN rooms.facilities IS 'JSONB array of facility features (wifi, AC, etc.)';
COMMENT ON COLUMN rooms.accessibility IS 'Wheelchair accessible (true/false)';
COMMENT ON COLUMN rooms.status IS 'Room status: available, maintenance, unavailable';

COMMENT ON COLUMN room_allocations.class_session_id IS 'The class session allocated to this room';
COMMENT ON COLUMN room_allocations.allocated_by IS 'User who made the allocation';
