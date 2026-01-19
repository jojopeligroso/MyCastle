/**
 * Next.js Middleware
 * Refreshes Supabase auth sessions on every request
 * Ref: spec/07-authentication.md
 *
 * DEVELOPMENT AUTH BYPASS:
 * When DEV_AUTH_BYPASS=true in development, this middleware injects a fixed
 * dev user identity while keeping all auth/authz paths intact.
 * See: lib/auth/dev-bypass-guard.ts
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isDevBypassActive, DEV_USER_IDENTITY } from '@/lib/auth/dev-bypass-guard';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const baseClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Apply dev bypass if active
  const supabase = applyDevBypass(baseClient);

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}

/**
 * Applies dev auth bypass to Supabase client if active
 * Centralizes bypass logic for middleware
 */
function applyDevBypass(client: SupabaseClient): SupabaseClient {
  if (!isDevBypassActive()) {
    return client;
  }

  // DEVELOPMENT BYPASS: Wrap auth methods to inject dev user
  const wrappedClient = client as SupabaseClient & {
    auth: typeof client.auth & {
      _originalGetUser?: typeof client.auth.getUser;
      _originalGetSession?: typeof client.auth.getSession;
    };
  };

  // Store original methods
  wrappedClient.auth._originalGetUser = wrappedClient.auth.getUser.bind(wrappedClient.auth);
  wrappedClient.auth._originalGetSession = wrappedClient.auth.getSession.bind(wrappedClient.auth);

  // Override getUser to return dev identity
  wrappedClient.auth.getUser = async () => {
    return {
      data: {
        user: DEV_USER_IDENTITY as any,
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
          token_type: 'bearer',
          user: DEV_USER_IDENTITY as any,
        },
      },
      error: null,
    };
  };

  return wrappedClient;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
