/**
 * Sign Out API Route
 * POST /api/auth/signout
 * Handles user sign-out and session cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[Sign Out API] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to sign out',
        },
        { status: 500 }
      );
    }

    // Redirect to login page after successful sign-out
    return NextResponse.redirect(new URL('/login', request.url));
  } catch (error) {
    console.error('[Sign Out API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
