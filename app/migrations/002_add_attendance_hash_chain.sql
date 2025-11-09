/**
 * Migration 002: Add Hash-Chain to Attendance Records
 * T-052: Hash-Chain Implementation (8 points, Medium)
 *
 * Implements tamper-evident attendance records using SHA256 hash chains.
 * Each attendance record contains:
 * - hash: SHA256(payload || previous_hash)
 * - previous_hash: Hash of the previous record in the chain
 *
 * This makes any modification to historical records immediately detectable.
 */

-- Add hash columns to attendance table
ALTER TABLE attendance
ADD COLUMN hash VARCHAR(64),
ADD COLUMN previous_hash VARCHAR(64);

-- Create index for hash lookups (for validation)
CREATE INDEX idx_attendance_hash ON attendance(hash);
CREATE INDEX idx_attendance_session_created ON attendance(class_session_id, created_at);

-- Add edit tracking columns
ALTER TABLE attendance
ADD COLUMN edited_at TIMESTAMP,
ADD COLUMN edited_by UUID REFERENCES users(id),
ADD COLUMN edit_count INTEGER DEFAULT 0,
ADD COLUMN is_within_edit_window BOOLEAN DEFAULT true;

-- Create audit log trigger for attendance changes
CREATE OR REPLACE FUNCTION log_attendance_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to audit_logs table
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    changes,
    ip_address,
    user_agent
  ) VALUES (
    NEW.tenant_id,
    NEW.edited_by,
    'UPDATE',
    'attendance',
    NEW.id,
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_hash', OLD.hash,
      'new_hash', NEW.hash,
      'edit_count', NEW.edit_count,
      'within_window', NEW.is_within_edit_window
    ),
    inet_client_addr(),
    current_setting('application.user_agent', true)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_change_audit
AFTER UPDATE ON attendance
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.hash IS DISTINCT FROM NEW.hash)
EXECUTE FUNCTION log_attendance_change();

-- Add comment explaining the hash chain
COMMENT ON COLUMN attendance.hash IS 'SHA256 hash of record (payload + previous_hash) for tamper detection';
COMMENT ON COLUMN attendance.previous_hash IS 'Hash of the previous attendance record in chronological order';
COMMENT ON COLUMN attendance.edited_at IS 'Timestamp of last edit (for 48-hour window policy)';
COMMENT ON COLUMN attendance.edited_by IS 'User who last edited the record';
COMMENT ON COLUMN attendance.edit_count IS 'Number of times this record has been edited';
COMMENT ON COLUMN attendance.is_within_edit_window IS 'Whether the edit is within the 48-hour window';
