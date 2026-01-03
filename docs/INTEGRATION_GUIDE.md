# MyCastle API Integration Guide

**Version:** 1.0
**Last Updated:** January 2026
**Goal:** Get developers from zero to first successful API integration in < 1 hour

---

## Table of Contents

1. [Quick Start (5 Minutes)](#quick-start-5-minutes)
2. [Authentication Integration](#authentication-integration)
3. [Making API Calls](#making-api-calls)
4. [Error Handling Best Practices](#error-handling-best-practices)
5. [Common Integration Patterns](#common-integration-patterns)
6. [Complete Example Workflows](#complete-example-workflows)
7. [Troubleshooting](#troubleshooting)
8. [Testing Your Integration](#testing-your-integration)

---

## Quick Start (5 Minutes)

### Prerequisites

- Node.js 18+ installed
- Git installed
- Code editor (VS Code recommended)

### Setup Steps

**1. Clone Repository**

```bash
git clone https://github.com/yourorg/mycastle.git
cd mycastle/app
```

**2. Install Dependencies**

```bash
npm install
```

**3. Environment Configuration**

Create `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=your-database-url

# OpenAI (for lesson generation)
OPENAI_API_KEY=your-openai-key
```

**4. Run Development Server**

```bash
npm run dev
```

Server starts at `http://localhost:3000`

**5. Make Your First API Call**

Open browser console at `http://localhost:3000` and paste:

```javascript
// Authenticate (assuming you have test credentials)
const response = await fetch('/api/auth/magic-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    redirectTo: window.location.origin + '/dashboard'
  })
});

const data = await response.json();
console.log(data);
// { message: "If an account exists, a magic link has been sent." }
```

**Congratulations!** You've made your first API call. Check your email for the magic link.

---

## Authentication Integration

MyCastle supports two authentication methods: **Password** (traditional) and **Magic Link** (passwordless). Both use Supabase Auth under the hood.

### Method 1: Password Authentication

**Use Case:** Traditional login form with email + password

**Client-Side Implementation:**

```typescript
// components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push('/dashboard');
      router.refresh(); // Refresh to update auth state
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

**What Happens:**
1. User submits email + password
2. Supabase validates credentials
3. Session cookie is set automatically (HTTP-only, secure)
4. Subsequent API requests include session cookie
5. User is redirected to dashboard

---

### Method 2: Magic Link (Passwordless)

**Use Case:** Passwordless authentication via email link (better UX, more secure)

**Client-Side Implementation:**

```typescript
// app/login/magic-link/page.tsx
'use client';

import { useState } from 'react';

export default function MagicLinkPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setError(`Too many requests. Please wait ${data.retryAfter || 60} seconds.`);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send magic link');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <h2>Check Your Email</h2>
        <p>
          We've sent a magic link to <strong>{email}</strong>.
          Click the link in the email to sign in.
        </p>
        <p>You can close this window.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Sign In with Magic Link</h1>

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Magic Link'}
      </button>
    </form>
  );
}
```

**What Happens:**
1. User submits email
2. API checks if email exists (prevents enumeration)
3. Email sent with one-time link (rate limited: 3/min per IP/email)
4. User clicks link → redirected to `/auth/callback?next=/dashboard`
5. Callback handler sets session cookie
6. User redirected to dashboard

**Security Features:**
- ✅ Rate limiting (3 requests/minute)
- ✅ Constant-time response (prevents email enumeration)
- ✅ Generic success message (doesn't reveal if email exists)
- ✅ Redirect URL validation (prevents phishing)

---

### Method 3: Server-Side Auth Check

**Use Case:** Protect server-side API routes and Server Actions

**Server-Side Utilities:**

```typescript
// lib/auth/utils.ts
import { createClient } from '@/lib/supabase/server';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth();

  const userRole = user.user_metadata?.role || user.app_metadata?.role;

  if (!allowedRoles.includes(userRole)) {
    throw new Error('Forbidden: Insufficient permissions');
  }

  return user;
}
```

**Usage in API Routes:**

```typescript
// app/api/admin/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/utils';
import { db } from '@/db';

export async function GET(request: NextRequest) {
  try {
    // Require admin role
    await requireAuth();
    await requireRole(['admin']);

    // Fetch students...
    const students = await db.select().from(students);

    return NextResponse.json({ students });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Usage in Server Actions:**

```typescript
// app/students/_actions/studentActions.ts
'use server';

import { requireAuth } from '@/lib/auth/utils';
import { db } from '@/db';
import { students } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export async function updateStudent(id: string, data: Partial<Student>) {
  await requireAuth(['admin']); // Throws if not authenticated

  await db.update(students)
    .set({ ...data, updated_at: new Date() })
    .where(eq(students.id, id));

  revalidatePath('/students');
  return { success: true };
}
```

---

### Client-Side Auth Hooks

**Use Case:** Display user info, protect client-side routes

```typescript
// lib/auth/hooks.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setState({
        user: session?.user ?? null,
        loading: false,
        error,
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({
          user: session?.user ?? null,
          loading: false,
          error: null,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return state;
}

// Usage in components
export function UserProfile() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div>
      <p>Welcome, {user.email}</p>
    </div>
  );
}
```

---

## Making API Calls

MyCastle uses **three distinct integration patterns** depending on the use case:

### Pattern 1: Server Components (Preferred for Data Fetching)

**Use Case:** Server-side rendering (SSR), initial page load data

**Example: Students List Page**

```typescript
// app/admin/students/page.tsx
import { db } from '@/db';
import { students } from '@/db/schema';
import { requireAuth } from '@/lib/auth/utils';
import { eq, isNull } from 'drizzle-orm';
import { StudentList } from '@/components/admin/StudentList';

async function getStudents(tenantId: string) {
  const allStudents = await db
    .select({
      id: students.id,
      name: students.name,
      email: students.email,
      current_level: students.current_level,
      status: students.status,
      created_at: students.created_at,
    })
    .from(students)
    .where(
      and(
        eq(students.tenant_id, tenantId),
        isNull(students.deleted_at) // Exclude soft-deleted
      )
    )
    .orderBy(students.created_at);

  return allStudents;
}

export default async function StudentsPage() {
  // Server-side auth check
  const user = await requireAuth();
  const tenantId = user.user_metadata?.tenant_id;

  // Fetch data server-side
  const studentsList = await getStudents(tenantId);

  // Pass to Client Component as props
  return (
    <div>
      <h1>Students</h1>
      <StudentList students={studentsList} />
    </div>
  );
}
```

**Advantages:**
- ✅ Data fetched server-side (faster, SEO-friendly)
- ✅ No client-side loading states needed
- ✅ Direct database access (no API round-trip)
- ✅ Type-safe with Drizzle ORM

**When to Use:**
- Initial page load data
- Public-facing pages (SEO important)
- Data that doesn't change frequently

---

### Pattern 2: Client Components with API Routes

**Use Case:** Client-side interactions, dynamic forms, user actions

**Example: Create Student Form**

```typescript
// components/admin/CreateStudentForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateStudentForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    current_level: 'B1',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create student');
      }

      const student = await response.json();
      router.push(`/admin/students/${student.id}`);
      router.refresh(); // Refresh to show new data
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label htmlFor="current_level">Current Level</label>
        <select
          id="current_level"
          name="current_level"
          value={formData.current_level}
          onChange={handleChange}
        >
          <option value="A1">A1 - Beginner</option>
          <option value="A2">A2 - Elementary</option>
          <option value="B1">B1 - Intermediate</option>
          <option value="B2">B2 - Upper Intermediate</option>
          <option value="C1">C1 - Advanced</option>
          <option value="C2">C2 - Proficiency</option>
        </select>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Student'}
      </button>
    </form>
  );
}
```

**API Route:**

```typescript
// app/api/admin/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/utils';
import { db } from '@/db';
import { students } from '@/db/schema';
import { z } from 'zod';

const createStudentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  current_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    await requireAuth(['admin']);

    // 2. Parse and validate request body
    const body = await request.json();
    const validationResult = createStudentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 3. Check for duplicate email
    const existing = await db
      .select()
      .from(students)
      .where(eq(students.email, data.email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // 4. Create student
    const [newStudent] = await db
      .insert(students)
      .values({
        ...data,
        role: 'student',
        status: 'active',
      })
      .returning();

    // 5. Return created student
    return NextResponse.json(newStudent, { status: 201 });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
```

**Advantages:**
- ✅ Client-side interactivity (forms, buttons)
- ✅ Immediate user feedback (loading, errors)
- ✅ Traditional REST API pattern (familiar)

**When to Use:**
- Forms (create, update)
- User-triggered actions (delete, download)
- Client-side state management needed

---

### Pattern 3: Server Actions (Modern Mutations)

**Use Case:** Mutations from client components without API routes

**Example: Update Student**

```typescript
// app/admin/students/_actions/studentActions.ts
'use server';

import { db } from '@/db';
import { students } from '@/db/schema';
import { requireAuth } from '@/lib/auth/utils';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

export async function updateStudent(
  id: string,
  data: Partial<{ name: string; current_level: string; phone: string }>
) {
  // 1. Authenticate
  await requireAuth(['admin']);

  // 2. Update student
  await db
    .update(students)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(students.id, id));

  // 3. Revalidate cache (Next.js 13+)
  revalidatePath('/admin/students');
  revalidatePath(`/admin/students/${id}`);

  return { success: true };
}

export async function deleteStudent(id: string) {
  await requireAuth(['admin']);

  // Soft delete
  await db
    .update(students)
    .set({ deleted_at: new Date() })
    .where(eq(students.id, id));

  revalidatePath('/admin/students');

  return { success: true };
}
```

**Client Component Usage:**

```typescript
// components/admin/StudentActions.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateStudent, deleteStudent } from '@/app/admin/students/_actions/studentActions';

interface Props {
  studentId: string;
  currentLevel: string;
}

export function StudentActions({ studentId, currentLevel }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLevelChange = async (newLevel: string) => {
    setLoading(true);

    const result = await updateStudent(studentId, {
      current_level: newLevel,
    });

    if (result.success) {
      alert('Level updated successfully');
      router.refresh(); // Refresh data
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this student?')) {
      return;
    }

    setLoading(true);

    const result = await deleteStudent(studentId);

    if (result.success) {
      router.push('/admin/students');
    }

    setLoading(false);
  };

  return (
    <div>
      <select
        value={currentLevel}
        onChange={(e) => handleLevelChange(e.target.value)}
        disabled={loading}
      >
        <option value="A1">A1</option>
        <option value="A2">A2</option>
        <option value="B1">B1</option>
        <option value="B2">B2</option>
        <option value="C1">C1</option>
        <option value="C2">C2</option>
      </select>

      <button onClick={handleDelete} disabled={loading}>
        Delete Student
      </button>
    </div>
  );
}
```

**Advantages:**
- ✅ No API route needed (less boilerplate)
- ✅ Executes server-side (secure, can access DB directly)
- ✅ Built-in cache revalidation (`revalidatePath`)
- ✅ Type-safe (TypeScript end-to-end)

**When to Use:**
- Simple mutations (update, delete)
- Form submissions (with `<form action={serverAction}>`)
- When API route feels like overkill

---

## Error Handling Best Practices

### Comprehensive Error Handling Template

```typescript
'use client';

import { useState } from 'react';

export function ApiCallExample() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApiCall = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
      });

      // Handle specific status codes
      if (response.status === 401) {
        // Redirect to login
        window.location.href = '/login';
        return;
      }

      if (response.status === 409) {
        const errorData = await response.json();
        // Handle conflict (e.g., duplicate email)
        setError(errorData.error || 'Resource already exists');
        return;
      }

      if (response.status === 400) {
        const errorData = await response.json();
        // Handle validation errors
        if (errorData.details?.fieldErrors) {
          const firstError = Object.values(errorData.details.fieldErrors)[0];
          setError(Array.isArray(firstError) ? firstError[0] : 'Validation failed');
        } else {
          setError(errorData.error || 'Invalid request');
        }
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }

      const result = await response.json();
      // Success handling
      console.log('Success:', result);
    } catch (err: any) {
      // Network errors, JSON parse errors, etc.
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      <button onClick={handleApiCall} disabled={loading}>
        {loading ? 'Processing...' : 'Make API Call'}
      </button>
    </div>
  );
}
```

### Error Code Handling Matrix

```typescript
const handleResponse = async (response: Response) => {
  switch (response.status) {
    case 401:
      // Unauthorized - redirect to login
      window.location.href = '/login';
      break;

    case 403:
      // Forbidden - show permission error
      setError('You do not have permission to perform this action');
      break;

    case 404:
      // Not found
      setError('Resource not found');
      break;

    case 409:
      // Conflict - business logic violation
      const conflictData = await response.json();
      setError(conflictData.error); // e.g., "Email already exists"
      break;

    case 429:
      // Rate limited
      const rateLimitData = await response.json();
      setError(`Too many requests. Please wait ${rateLimitData.retryAfter || 60} seconds.`);
      break;

    case 400:
      // Validation error
      const validationData = await response.json();
      if (validationData.details?.fieldErrors) {
        // Display field-specific errors
        setFieldErrors(validationData.details.fieldErrors);
      } else {
        setError(validationData.error);
      }
      break;

    case 500:
      // Server error
      setError('Server error. Please try again later.');
      break;

    default:
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Request failed');
      }
  }
};
```

---

## Common Integration Patterns

### Pagination

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Student {
  id: string;
  name: string;
  email: string;
}

export function StudentListWithPagination() {
  const [students, setStudents] = useState<Student[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const limit = 50;

  const loadStudents = async (currentOffset: number) => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/students?limit=${limit}&offset=${currentOffset}`
      );

      if (!response.ok) {
        throw new Error('Failed to load students');
      }

      const data = await response.json();

      setStudents(prev => [...prev, ...data.students]);
      setHasMore(data.pagination.hasMore);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents(0);
  }, []);

  const loadMore = () => {
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    loadStudents(nextOffset);
  };

  return (
    <div>
      <ul>
        {students.map(student => (
          <li key={student.id}>
            {student.name} - {student.email}
          </li>
        ))}
      </ul>

      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

---

### Filtering & Search

```typescript
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Filters {
  search: string;
  status: string;
  level: string;
}

export function StudentFilters({ students }: { students: Student[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'all',
    level: searchParams.get('level') || 'all',
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.search) params.set('search', filters.search);
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.level !== 'all') params.set('level', filters.level);

    router.push(`/admin/students?${params.toString()}`);
  }, [filters]);

  // Client-side filtering (or trigger server refetch)
  const filteredStudents = useMemo(() => {
    let filtered = [...students];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.name.toLowerCase().includes(searchLower) ||
          s.email.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(s => s.status === filters.status);
    }

    if (filters.level !== 'all') {
      filtered = filtered.filter(s => s.current_level === filters.level);
    }

    return filtered;
  }, [students, filters]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search by name or email..."
        value={filters.search}
        onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
      />

      <select
        value={filters.status}
        onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
      >
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>

      <select
        value={filters.level}
        onChange={e => setFilters(prev => ({ ...prev, level: e.target.value }))}
      >
        <option value="all">All Levels</option>
        <option value="A1">A1</option>
        <option value="A2">A2</option>
        <option value="B1">B1</option>
        <option value="B2">B2</option>
        <option value="C1">C1</option>
        <option value="C2">C2</option>
      </select>

      <div>
        <p>Showing {filteredStudents.length} students</p>
        {/* Render filteredStudents */}
      </div>
    </div>
  );
}
```

---

### Type-Safe Validation with Zod

```typescript
'use client';

import { z } from 'zod';
import { useState } from 'react';

// Define schema (matches server-side schema)
const studentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  current_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  phone: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

export function ValidatedStudentForm() {
  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation before API call
    const validationResult = studentSchema.safeParse(formData);

    if (!validationResult.success) {
      // Convert Zod errors to field errors
      const fieldErrors: Record<string, string> = {};
      validationResult.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Make API call with validated data
    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationResult.data),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      // Success
      alert('Student created successfully');
    } catch (error: any) {
      setErrors({ form: error.message });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {errors.form && <div className="error">{errors.form}</div>}

      <div>
        <label>Name</label>
        <input
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div>
        <label>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <button type="submit">Create Student</button>
    </form>
  );
}
```

---

## Complete Example Workflows

### Workflow 1: Student Enrollment Lifecycle

**Complete flow from student creation to enrollment with payment:**

```typescript
'use server';

import { db } from '@/db';
import { students, enrollments, invoices, payments } from '@/db/schema';

export async function enrollStudentWorkflow(studentData: {
  name: string;
  email: string;
  classId: string;
  invoiceAmount: number;
}) {
  // Step 1: Create student
  const [student] = await db
    .insert(students)
    .values({
      name: studentData.name,
      email: studentData.email,
      role: 'student',
      status: 'active',
    })
    .returning();

  // Step 2: Create enrollment
  const [enrollment] = await db
    .insert(enrollments)
    .values({
      student_id: student.id,
      class_id: studentData.classId,
      start_date: new Date().toISOString().split('T')[0],
      status: 'active',
    })
    .returning();

  // Step 3: Create invoice
  const [invoice] = await db
    .insert(invoices)
    .values({
      student_id: student.id,
      amount: studentData.invoiceAmount,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
      status: 'pending',
    })
    .returning();

  // Step 4: (Optional) Record initial payment
  // const [payment] = await db.insert(payments).values({...}).returning();

  return {
    student,
    enrollment,
    invoice,
  };
}
```

**Client-side usage:**

```typescript
'use client';

import { enrollStudentWorkflow } from '@/app/_actions/enrollment';

const handleEnrollment = async () => {
  const result = await enrollStudentWorkflow({
    name: 'John Doe',
    email: 'john@example.com',
    classId: 'class-123',
    invoiceAmount: 1500,
  });

  console.log('Student enrolled:', result.student.id);
  console.log('Enrollment created:', result.enrollment.id);
  console.log('Invoice created:', result.invoice.invoice_number);
};
```

---

### Workflow 2: Search & View Student Details

```typescript
'use client';

import { useState } from 'react';

export function StudentSearchWorkflow() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Step 1: Global search
  const handleSearch = async () => {
    const response = await fetch(`/api/admin/search?q=${searchQuery}`);
    const data = await response.json();
    setSearchResults(data.students || []);
  };

  // Step 2: Get student details
  const handleSelectStudent = async (studentId: string) => {
    const response = await fetch(`/api/admin/students/${studentId}`);
    const student = await response.json();
    setSelectedStudent(student);
  };

  // Step 3: View audit history
  const handleViewAudit = async () => {
    const response = await fetch(
      `/api/admin/audit-log?entity_type=student&entity_id=${selectedStudent.id}`
    );
    const data = await response.json();
    console.log('Audit history:', data.logs);
  };

  return (
    <div>
      <input
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search students..."
      />
      <button onClick={handleSearch}>Search</button>

      <ul>
        {searchResults.map(student => (
          <li key={student.id} onClick={() => handleSelectStudent(student.id)}>
            {student.name} - {student.email}
          </li>
        ))}
      </ul>

      {selectedStudent && (
        <div>
          <h2>{selectedStudent.name}</h2>
          <p>Email: {selectedStudent.email}</p>
          <p>Level: {selectedStudent.current_level}</p>

          <h3>Enrollments</h3>
          <ul>
            {selectedStudent.enrollments?.map((e: any) => (
              <li key={e.id}>{e.className}</li>
            ))}
          </ul>

          <button onClick={handleViewAudit}>View Audit History</button>
        </div>
      )}
    </div>
  );
}
```

---

## Troubleshooting

### Common Issues & Solutions

#### Issue: 401 Unauthorized

**Symptoms:** All API calls return `{ "error": "Unauthorized" }`

**Causes:**
- Not authenticated (no session cookie)
- Expired session
- Missing authentication header

**Solutions:**
1. Check if you're logged in: `await supabase.auth.getSession()`
2. Re-authenticate via password or magic link
3. Verify middleware is refreshing sessions (`middleware.ts`)
4. Check browser cookies (should have `sb-*` cookies)

**Debug:**
```typescript
const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session); // Should not be null
```

---

#### Issue: 404 Not Found

**Symptoms:** `{ "error": "Student not found" }`

**Causes:**
- Invalid resource ID
- Resource has been soft-deleted (`deleted_at` is set)
- Wrong tenant (multi-tenancy issue)

**Solutions:**
1. Verify resource ID is correct (UUID format)
2. Check if resource was soft-deleted: `SELECT * FROM students WHERE deleted_at IS NOT NULL`
3. Verify tenant_id matches authenticated user

---

#### Issue: 409 Conflict

**Symptoms:** `{ "error": "Class is at full capacity" }` or `{ "error": "A user with this email already exists" }`

**Causes:**
- Business logic violation
- Duplicate resources
- Capacity limits

**Solutions:**
1. Check error message for specific violation
2. For duplicate email: use different email or update existing user
3. For class capacity: enroll in different class or increase capacity
4. For overpayment: verify invoice amount_due before payment

---

#### Issue: 500 Internal Server Error

**Symptoms:** `{ "error": "Failed to create student" }`

**Causes:**
- Database connection error
- Constraint violation
- Unexpected server error

**Solutions:**
1. Check server logs: `npm run dev` terminal output
2. Verify database is running and accessible
3. Check for database constraint violations (foreign keys, unique constraints)
4. Review recent code changes for bugs

**Debug:**
```bash
# Check database connection
npm run db:studio

# View logs
tail -f .next/server.log
```

---

#### Issue: Rate Limiting (429 Too Many Requests)

**Symptoms:** `{ "error": "Too many requests. Please wait 60 seconds.", "retryAfter": 60 }`

**Applies to:** Magic link authentication (3 requests/min per IP/email)

**Solutions:**
1. Wait for `retryAfter` seconds
2. Don't spam the magic link endpoint
3. Implement client-side rate limiting (disable button for 60s)

---

## Testing Your Integration

### Unit Testing API Routes

```typescript
// __tests__/api/students.test.ts
import { POST } from '@/app/api/admin/students/route';
import { NextRequest } from 'next/server';

describe('Student API', () => {
  it('creates a student successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/students', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Student',
        email: 'test@example.com',
        current_level: 'B1',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe('Test Student');
    expect(data.email).toBe('test@example.com');
    expect(data.role).toBe('student');
  });

  it('rejects duplicate email', async () => {
    // Create first student
    await POST(new NextRequest('http://localhost:3000/api/admin/students', {
      method: 'POST',
      body: JSON.stringify({ name: 'Student 1', email: 'duplicate@example.com' }),
    }));

    // Attempt to create duplicate
    const response = await POST(new NextRequest('http://localhost:3000/api/admin/students', {
      method: 'POST',
      body: JSON.stringify({ name: 'Student 2', email: 'duplicate@example.com' }),
    }));

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe('A user with this email already exists');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test students.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## Next Steps

### You've Completed the Integration Guide!

**What you've learned:**
- ✅ Quick setup (5 minutes)
- ✅ Three authentication methods
- ✅ Three API integration patterns
- ✅ Error handling best practices
- ✅ Common patterns (pagination, filtering, validation)
- ✅ Complete workflows
- ✅ Troubleshooting

**Recommended Next Steps:**

1. **Read API Reference Guide** (`docs/API_REFERENCE.md`)
   - Complete endpoint documentation
   - Request/response examples
   - Data models

2. **Explore Test Files** (`app/src/app/api/**/__tests__/*.test.ts`)
   - 156+ real-world integration examples
   - See how each endpoint is tested

3. **Build Your First Feature**
   - Try creating a student enrollment flow
   - Experiment with Server Actions
   - Test error handling

4. **Share Feedback**
   - Report issues on GitHub
   - Suggest improvements
   - Contribute to documentation

---

**Need Help?**
- Check troubleshooting section
- Review test files for examples
- Contact development team

**Happy Integrating!** 🚀
