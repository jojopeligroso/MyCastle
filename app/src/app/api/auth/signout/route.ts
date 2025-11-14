/**
 * Sign Out API Route
 *
 * Handles user sign out by clearing the Supabase session.
 * Supports both POST (from forms) and GET (from links) methods.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  try {
    const supabase = await createClient();

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      // Still redirect to sign out page even if there's an error
    }

    // Redirect to sign out confirmation page
    const signOutUrl = new URL('/signout', origin);
    signOutUrl.searchParams.set('status', 'success');
    return NextResponse.redirect(signOutUrl);

  } catch (error) {
    console.error('Sign out error:', error);

    // Even on error, redirect to sign out page
    const signOutUrl = new URL('/signout', origin);
    signOutUrl.searchParams.set('status', 'error');
    return NextResponse.redirect(signOutUrl);
  }
}

// Also support GET method for direct links
export async function GET(request: NextRequest) {
  return POST(request);
}
