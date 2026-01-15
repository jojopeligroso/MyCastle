/**
 * Admin User API - Update and manage individual user
 * PATCH /api/admin/users/[id] - Update user
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['student', 'teacher', 'admin', 'super_admin']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

// Initialize Supabase Admin client
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
    const validatedData = updateUserSchema.parse(body);

    // Check if user exists and belongs to tenant
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenant_id, tenantId)))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user metadata in Supabase Auth if email or role changed
    if (validatedData.email || validatedData.role || validatedData.name) {
      const authUpdates: any = {};

      if (validatedData.email) {
        authUpdates.email = validatedData.email;
      }

      if (validatedData.role || validatedData.name) {
        authUpdates.user_metadata = {
          ...existingUser,
          ...(validatedData.name && { name: validatedData.name }),
          ...(validatedData.role && { role: validatedData.role }),
        };
      }

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);

      if (authError) {
        console.error('Supabase auth error:', authError);
        return NextResponse.json(
          { error: authError.message || 'Failed to update auth user' },
          { status: 400 }
        );
      }
    }

    // Update user in database
    const [updatedUser] = await db
      .update(users)
      .set({
        ...validatedData,
        updated_at: new Date(),
      })
      .where(and(eq(users.id, id), eq(users.tenant_id, tenantId)))
      .returning();

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error updating user:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}
