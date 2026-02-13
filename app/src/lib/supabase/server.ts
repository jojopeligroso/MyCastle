/**
 * Supabase Server Client Configuration
 * Server-side client for Server Components and Route Handlers
 * Ref: spec/07-authentication.md
 *
 * DEVELOPMENT AUTH BYPASS:
 * When DEV_AUTH_BYPASS=true in development, this client injects a fixed
 * dev user identity while keeping all auth/authz paths intact.
 * See: lib/auth/dev-bypass-guard.ts
 */

import { createServerClient as createSupabaseClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isDevBypassActive, DEV_USER_IDENTITY } from '@/lib/auth/dev-bypass-guard';

/**
 * Creates a Supabase server client with optional dev auth bypass
 * The bypass only activates when NODE_ENV=development AND DEV_AUTH_BYPASS=true
 * All other auth flows remain unchanged
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  const baseClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  // If dev bypass is not active, return the standard client
  if (!isDevBypassActive()) {
    return baseClient;
  }

  // DEVELOPMENT BYPASS: Wrap auth methods to inject dev user
  // This keeps all auth/authz paths intact - only the identity source changes
  const wrappedClient = baseClient as SupabaseClient & {
    auth: typeof baseClient.auth & {
      _originalGetUser?: typeof baseClient.auth.getUser;
      _originalGetSession?: typeof baseClient.auth.getSession;
    };
  };

  // Store original methods
  wrappedClient.auth._originalGetUser = wrappedClient.auth.getUser.bind(wrappedClient.auth);
  wrappedClient.auth._originalGetSession = wrappedClient.auth.getSession.bind(wrappedClient.auth);

  // Override getUser to return dev identity
  wrappedClient.auth.getUser = async () => {
    return {
      data: {
        user: DEV_USER_IDENTITY as unknown as User,
      },
      error: null,
    };
  };

  // Override getSession to return dev session
  wrappedClient.auth.getSession = async () => {
    return {
      data: {
        session: {
          access_token: 'dev-bypass-token',
          refresh_token: 'dev-bypass-refresh',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer' as const,
          user: DEV_USER_IDENTITY as unknown as User,
        },
      },
      error: null,
    };
  };

  console.log('🔓 DEV AUTH BYPASS ACTIVE - Logged in as admin:', DEV_USER_IDENTITY.email);

  return wrappedClient;
};
