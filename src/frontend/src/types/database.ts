/**
 * Database type definitions
 * These types will be generated from Supabase schema once database is set up
 *
 * For now, this is a placeholder for common types
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Add more tables as they are created
    };
    Views: {
      // Add views here
    };
    Functions: {
      // Add functions here
    };
    Enums: {
      // Add enums here
    };
  };
}
