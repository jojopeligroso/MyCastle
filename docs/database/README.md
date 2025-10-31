# Database Setup Guide

This guide explains how to set up and manage the PostgreSQL database for the ESL Learning Platform using Supabase.

## Overview

The ESL Learning Platform uses **Supabase** (PostgreSQL) as its database backend with the following features:

- **13 core tables** for users, courses, lessons, assignments, progress tracking, conversations, and more
- **Row Level Security (RLS)** policies for role-based access control
- **Database functions** for common operations (auto-grading, statistics, etc.)
- **Full-text search** capabilities for content library
- **Comprehensive indexes** for optimal query performance

## Prerequisites

Before you begin, ensure you have:

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Supabase CLI**: Install the Supabase CLI tool
3. **Node.js**: Version 18+ (for TypeScript types)
4. **Git**: For version control

### Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase

# NPM (all platforms)
npm install -g supabase
```

## Quick Start

### 1. Initialize Supabase

If you haven't already initialized Supabase in your project:

```bash
# Navigate to project root
cd /home/eoin/work/esl-learning-platform

# Initialize Supabase (creates supabase/ directory)
supabase init
```

### 2. Link to Your Supabase Project

```bash
# Link to your remote Supabase project
supabase link --project-ref <your-project-ref>

# Get your project ref from Supabase dashboard:
# Settings > General > Reference ID
```

### 3. Run Migrations

Execute the SQL migration files in order:

```bash
# Method 1: Using Supabase CLI (Recommended)
supabase db push

# Method 2: Run migrations individually via psql
psql -h <your-db-host> -U postgres -d postgres -f docs/database/001_create_tables.sql
psql -h <your-db-host> -U postgres -d postgres -f docs/database/002_create_indexes.sql
psql -h <your-db-host> -U postgres -d postgres -f docs/database/003_enable_rls.sql
psql -h <your-db-host> -U postgres -d postgres -f docs/database/004_create_policies.sql
psql -h <your-db-host> -U postgres -d postgres -f docs/database/005_create_functions.sql
psql -h <your-db-host> -U postgres -d postgres -f docs/database/006_seed_data.sql

# Method 3: Using Supabase Dashboard
# Copy and paste each SQL file into the SQL Editor
```

### 4. Verify Installation

```bash
# Check if tables were created
supabase db list

# Or connect to database and verify
psql <your-connection-string> -c "\dt"
```

## Migration Files

### 001_create_tables.sql
Creates all 13 core tables:
- `users` - Platform users (students, teachers, admins)
- `courses` - Available courses
- `lessons` - Individual lessons within courses
- `enrollments` - Student-course relationships
- `assignments` - Quizzes, homework, exams
- `submissions` - Student assignment submissions
- `student_progress` - Progress tracking
- `conversation_sessions` - AI chat sessions
- `conversation_messages` - Chat messages
- `content_library` - Teaching materials repository
- `feedback` - User feedback and support tickets
- `announcements` - Teacher/admin announcements
- `system_logs` - Platform activity logs

### 002_create_indexes.sql
Creates performance indexes on:
- Foreign keys for faster joins
- Frequently queried columns (email, role, status)
- Date columns for time-based queries
- GIN indexes for JSONB and array columns

### 003_enable_rls.sql
Enables Row Level Security on all tables to enforce access control at the database level.

### 004_create_policies.sql
Defines RLS policies for each user role:

**Students:**
- Read their own profile
- Read enrolled courses and lessons
- Create/read their own submissions
- Read/update their own progress
- Manage their own conversation sessions

**Teachers:**
- Read their own profile
- Create/manage their own courses
- Read students enrolled in their courses
- Create/manage assignments for their courses
- Grade submissions for their courses
- View student progress in their courses

**Admins:**
- Full read access to all tables
- Manage users, courses, and content
- View all feedback and system logs

### 005_create_functions.sql
Creates useful database functions:
- `update_updated_at_column()` - Auto-update timestamp trigger
- `update_enrollment_progress()` - Calculate course progress
- `auto_grade_submission()` - Auto-grade multiple choice assignments
- `get_course_statistics()` - Comprehensive course stats
- `get_student_performance()` - Student performance summary
- `log_system_event()` - Easy event logging
- `search_content_library()` - Full-text search
- `get_upcoming_assignments()` - Due assignments for students

### 006_seed_data.sql
Populates the database with test data:
- 1 admin user
- 2 teacher users
- 5 student users
- 3 courses with lessons
- Enrollments, assignments, submissions
- Sample conversations
- Content library items
- Announcements and feedback

## Database Schema

### Entity Relationship Overview

```
Users (1) ──< (M) Enrollments >── (1) Courses
  │                                    │
  │                                    ├──< (M) Lessons
  │                                    │         │
  │                                    ├──< (M) Assignments
  │                                    │         │
  │                                    └──< (M) ContentLibrary
  │
  ├──< (M) Submissions
  ├──< (M) StudentProgress
  ├──< (M) ConversationSessions
  │         └──< (M) ConversationMessages
  ├──< (M) Feedback
  ├──< (M) Announcements
  └──< (M) SystemLogs
```

For detailed schema documentation, see [../data-model.md](../data-model.md).

## TypeScript Types

TypeScript type definitions are available in:

```typescript
// Import database types
import {
  User,
  Course,
  Lesson,
  Assignment,
  // ... and more
} from './src/backend/types/database';

// Insert types (omit auto-generated fields)
import {
  UserInsert,
  CourseInsert
} from './src/backend/types/database';

// Update types (all fields optional)
import {
  UserUpdate,
  CourseUpdate
} from './src/backend/types/database';
```

## Supabase Client Setup

### Install Supabase JS Client

```bash
npm install @supabase/supabase-js
```

### Initialize Client

```typescript
// src/backend/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Environment Variables

Create a `.env` file in your project root:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these values from your Supabase dashboard:
- **Settings > API > Project URL**
- **Settings > API > Project API keys**

## Common Operations

### Query Examples

```typescript
// Get all active students
const { data: students } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'student')
  .eq('is_active', true);

// Get courses with creator info
const { data: courses } = await supabase
  .from('courses')
  .select(`
    *,
    creator:created_by (
      id,
      full_name,
      email
    )
  `)
  .eq('is_published', true);

// Get student's enrollments with course details
const { data: enrollments } = await supabase
  .from('enrollments')
  .select(`
    *,
    course:courses (
      id,
      title,
      description,
      grade_level
    )
  `)
  .eq('student_id', userId)
  .eq('status', 'active');

// Create a new submission
const { data: submission, error } = await supabase
  .from('submissions')
  .insert({
    assignment_id: assignmentId,
    student_id: studentId,
    answers: [
      { id: 'q1', answer: 'adverb' },
      { id: 'q2', answer: 'noun' }
    ]
  })
  .select()
  .single();

// Update student progress
const { error } = await supabase
  .from('student_progress')
  .upsert({
    student_id: studentId,
    course_id: courseId,
    lesson_id: lessonId,
    topic: 'Verb Tenses',
    mastery_level: 'learning',
    attempts: 1,
    metadata: {
      time_spent_minutes: 30,
      hints_used: 2
    }
  });

// Call a database function
const { data: stats } = await supabase
  .rpc('get_course_statistics', {
    p_course_id: courseId
  });
```

### RLS and Authentication

RLS policies use `auth.uid()` to identify the current user. When using Supabase Auth:

```typescript
// Sign in a user
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'student@example.com',
  password: 'password123'
});

// RLS will now automatically apply based on the authenticated user
// Students will only see their own data
const { data: mySubmissions } = await supabase
  .from('submissions')
  .select('*');
// Only returns submissions where student_id = auth.uid()
```

### Using Service Role Key (Bypass RLS)

For admin operations or system tasks:

```typescript
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key
);

// Can now access all data regardless of RLS
const { data: allUsers } = await supabaseAdmin
  .from('users')
  .select('*');
```

**⚠️ Warning:** Only use the service role key in secure backend code, never expose it to the client.

## Maintenance

### Backup Database

```bash
# Backup entire database
supabase db dump -f backup.sql

# Backup specific tables
pg_dump -h <host> -U postgres -d postgres -t users -t courses > backup.sql
```

### Reset Database (Development Only)

```bash
# Reset local database
supabase db reset

# This will:
# 1. Drop all tables
# 2. Re-run all migrations
# 3. Re-apply seed data
```

### View Logs

```bash
# View database logs
supabase logs db

# Stream logs in real-time
supabase logs db --follow
```

### Generate Types from Database

Supabase can auto-generate TypeScript types from your database schema:

```bash
# Generate types
supabase gen types typescript --project-id <your-project-id> > src/backend/types/supabase.ts
```

## Troubleshooting

### Connection Issues

```bash
# Test database connection
supabase db ping

# Check if migrations have been applied
supabase db list
```

### RLS Policy Errors

If you get permission denied errors:

1. Check if RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'users';`
2. Verify user is authenticated: `SELECT auth.uid();`
3. Review policies: Check `004_create_policies.sql`
4. Test with service role key to bypass RLS

### Migration Errors

If a migration fails:

```bash
# Check migration status
supabase migration list

# Manually fix and re-run
supabase db reset
```

## Security Best Practices

1. **Never expose service role key** in client-side code
2. **Always use RLS policies** for data access control
3. **Validate input** before database operations
4. **Use parameterized queries** to prevent SQL injection
5. **Rotate database credentials** regularly
6. **Monitor logs** for suspicious activity
7. **Keep Supabase CLI and dependencies updated**

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Data Model Documentation](../data-model.md)

## Support

For issues or questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review [Supabase documentation](https://supabase.com/docs)
3. Contact the development team
4. Submit feedback via the platform's feedback system

---

**Last Updated:** 2025-10-30
**Schema Version:** 1.0.0
