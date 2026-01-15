/**
 * Supabase Client Configuration
 * Browser-side client for client components
 * Ref: spec/07-authentication.md
 */

import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
