/**
 * Authentication React Hooks
 * Client-side hooks for auth state management
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthState, AppUser } from './types';

/**
 * Hook to get current auth state
 * Automatically subscribes to auth changes
 */
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
      if (error) {
        setState({ user: null, loading: false, error });
      } else {
        setState({
          user: session?.user as AppUser | null,
          loading: false,
          error: null,
        });
      }
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user as AppUser | null,
        loading: false,
        error: null,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}

/**
 * Hook to get current user
 * Returns null if not authenticated
 */
export function useUser() {
  const { user, loading } = useAuth();
  return { user, loading };
}

/**
 * Hook to check if user has specific role
 */
export function useRole(allowedRoles: string[]) {
  const { user, loading } = useAuth();
  const hasRole = user
    ? allowedRoles.includes(user.user_metadata?.role)
    : false;
  return { hasRole, loading };
}
