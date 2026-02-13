/**
 * Admin Users API - Create and list users
 * POST /api/admin/users - Create new user
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['student', 'teacher', 'admin', 'super_admin']),
  password: z.string().min(8).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
});

// Initialize Supabase Admin client for user creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Verify admin role
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAdmin =
      userRole === 'admin' || userRole === 'super_admin' || userRole?.startsWith('admin_');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Generate a random password if not provided
    const password = validatedData.password || generateRandomPassword();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validatedData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: validatedData.name,
        role: validatedData.role,
        tenant_id: tenantId,
      },
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return NextResponse.json(
        { error: authError.message || 'Failed to create auth user' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create user in database
    const [newUser] = await db
      .insert(users)
      .values({
        id: authData.user.id,
        tenantId: tenantId,
        email: validatedData.email,
        name: validatedData.name,
        primaryRole: validatedData.role,
        status: validatedData.status,
      })
      .returning();

    return NextResponse.json({
      success: true,
      user: newUser,
      temporaryPassword: validatedData.password ? undefined : password,
    });
  } catch (error: unknown) {
    console.error('Error creating user:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: (error as unknown as { issues: unknown[] }).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: 500 }
    );
  }
}

/**
 * Helper: Generate random password
 */
function generateRandomPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
