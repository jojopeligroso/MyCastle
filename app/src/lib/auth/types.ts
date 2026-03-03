/**
 * Authentication Type Definitions
 * Extends Supabase User type with app-specific fields
 */

import type { User } from '@supabase/supabase-js';

/**
 * User roles in the system
 * - admin: Full system access
 * - dos: Director of Studies - can access all students, approve promotions
 * - assistant_dos: Assistant Director of Studies - same as dos
 * - teacher: Can access students in their classes
 * - student: Can access own profile
 */
export type UserRole = 'admin' | 'dos' | 'assistant_dos' | 'teacher' | 'student';

/**
 * Extended user metadata
 */
export interface UserMetadata {
  role: UserRole;
  tenant_id: string;
  name?: string;
  avatar_url?: string;
}

/**
 * App-specific user type
 */
export interface AppUser extends User {
  user_metadata: UserMetadata;
}

/**
 * Session context
 */
export interface SessionContext {
  user: AppUser;
  tenantId: string;
  role: UserRole;
}

/**
 * Auth state for client components
 */
export interface AuthState {
  user: AppUser | null;
  loading: boolean;
  error: Error | null;
}
