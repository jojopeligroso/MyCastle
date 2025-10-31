import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

/**
 * Database schema types
 * These should be generated from Supabase or defined based on your schema
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          status?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string | null;
          avatar_url?: string | null;
          role: string;
          status?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          status?: string;
        };
      };
      classes: {
        Row: {
          id: string;
          name: string;
          level: string;
          schedule: any;
          capacity: number;
          enrolled_count?: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          level: string;
          schedule: any;
          capacity: number;
        };
        Update: {
          name?: string;
          level?: string;
          schedule?: any;
          capacity?: number;
        };
      };
      rosters: {
        Row: {
          id: string;
          class_id: string;
          teacher_id: string;
          start: string;
          end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          teacher_id: string;
          start: string;
          end: string;
        };
        Update: {
          class_id?: string;
          teacher_id?: string;
          start?: string;
          end?: string;
        };
      };
      enrolments: {
        Row: {
          id: string;
          student_id: string;
          class_id: string;
          status: string;
          start_date: string;
          end_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          class_id: string;
          status: string;
          start_date: string;
          end_date?: string | null;
        };
        Update: {
          status?: string;
          start_date?: string;
          end_date?: string | null;
        };
      };
      attendance: {
        Row: {
          id: string;
          class_id: string;
          student_id: string;
          register_date: string;
          status: string;
          note: string | null;
          recorded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          student_id: string;
          register_date: string;
          status: string;
          note?: string | null;
          recorded_by: string;
        };
        Update: {
          status?: string;
          note?: string | null;
        };
      };
      invoices: {
        Row: {
          id: string;
          student_id: string;
          amount: number;
          paid_amount: number;
          currency: string;
          status: string;
          due_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          amount: number;
          paid_amount?: number;
          currency: string;
          status: string;
          due_date: string;
        };
        Update: {
          amount?: number;
          paid_amount?: number;
          status?: string;
        };
      };
      refund_requests: {
        Row: {
          id: string;
          invoice_id: string;
          requested_by: string;
          amount: number;
          reason: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          requested_by: string;
          amount: number;
          reason: string;
          status: string;
        };
        Update: {
          status?: string;
        };
      };
      accommodation_placements: {
        Row: {
          id: string;
          student_id: string;
          provider_id: string;
          start: string;
          end: string;
          cost: number;
          status: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          provider_id: string;
          start: string;
          end: string;
          cost: number;
          status?: string;
          created_by: string;
        };
        Update: {
          start?: string;
          end?: string;
          cost?: number;
          status?: string;
        };
      };
      accommodation_providers: {
        Row: {
          id: string;
          name: string;
          type: string;
          status: string;
          contact: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          status?: string;
          contact: string;
        };
        Update: {
          name?: string;
          type?: string;
          status?: string;
          contact?: string;
        };
      };
      compliance_documents: {
        Row: {
          id: string;
          owner_type: string;
          owner_id: string;
          kind: string;
          path: string;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_type: string;
          owner_id: string;
          kind: string;
          path: string;
          verified_at?: string | null;
        };
        Update: {
          verified_at?: string | null;
        };
      };
      students: {
        Row: {
          id: string;
          user_id: string | null;
          visa_type: string;
          visa_expiry: string | null;
          status: string;
          cohort: string;
          start_date: string;
          end_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          visa_type: string;
          visa_expiry?: string | null;
          status: string;
          cohort: string;
          start_date: string;
          end_date?: string | null;
        };
        Update: {
          visa_type?: string;
          visa_expiry?: string | null;
          status?: string;
          end_date?: string | null;
        };
      };
      registers: {
        Row: {
          id: string;
          class_id: string;
          register_date: string;
          name?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          register_date: string;
          name?: string;
        };
        Update: {
          register_date?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          actor: string;
          action: string;
          target: string;
          scope: string;
          diff_hash: string;
          correlation_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor: string;
          action: string;
          target: string;
          scope: string;
          diff_hash: string;
          correlation_id: string;
        };
        Update: never;
      };
    };
  };
}

/**
 * Create a Supabase client with the provided auth token
 * This allows RLS policies to be applied based on the token's claims
 */
export function createSupabaseClient(token: string): SupabaseClient<Database> {
  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL environment variable is not set');
  }

  if (!SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY environment variable is not set');
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Create an admin Supabase client (uses service role key if available)
 * WARNING: This bypasses RLS. Use only when absolutely necessary.
 */
export function createAdminSupabaseClient(): SupabaseClient<Database> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  return createClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Type-safe table accessor
 */
export type Tables = Database['public']['Tables'];
export type TableName = keyof Tables;
export type TableRow<T extends TableName> = Tables[T]['Row'];
export type TableInsert<T extends TableName> = Tables[T]['Insert'];
export type TableUpdate<T extends TableName> = Tables[T]['Update'];
