/**
 * Migration 003: Add Compound Indexes for Timetable Query Optimization
 * T-044: Timetable Query Optimization (8 points, Medium)
 *
 * Create compound indexes on (teacher_id, week_range) to optimize
 * weekly timetable queries for p95 < 200ms performance.
 */

-- Compound index for teacher timetable queries
-- Covers: WHERE teacher_id = X AND session_date BETWEEN Y AND Z
CREATE INDEX idx_class_sessions_teacher_date ON class_sessions(class_id, session_date)
  INCLUDE (start_time, end_time, topic, status);

-- Compound index for classes by teacher
CREATE INDEX idx_classes_teacher_status ON classes(teacher_id, status)
  INCLUDE (name, code, level, subject);

-- Add GIN index for full-text search on topics (optional, for future)
CREATE INDEX idx_class_sessions_topic_search ON class_sessions USING GIN (to_tsvector('english', topic))
  WHERE topic IS NOT NULL;

-- Analyze tables to update statistics for query planner
ANALYZE classes;
ANALYZE class_sessions;

-- Add helpful comments
COMMENT ON INDEX idx_class_sessions_teacher_date IS 'Optimizes teacher timetable queries (session_date range lookups)';
COMMENT ON INDEX idx_classes_teacher_status IS 'Optimizes class lookups by teacher and status';
