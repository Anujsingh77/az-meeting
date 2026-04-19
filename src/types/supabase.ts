export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          job_title: string | null;
          native_language: string;
          preferred_language: string;
          languages: string[];
          plan: "free" | "pro" | "enterprise";
          total_meetings: number;
          total_minutes: number;
          total_words_translated: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          job_title?: string | null;
          native_language?: string;
          preferred_language?: string;
          languages?: string[];
          plan?: "free" | "pro" | "enterprise";
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      meetings: {
        Row: {
          id: string;
          code: string;
          title: string;
          host_id: string;
          scheduled_at: string | null;
          duration_minutes: number | null;
          languages: string[];
          status: "scheduled" | "active" | "ended";
          recording_url: string | null;
          summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code?: string;
          title: string;
          host_id: string;
          scheduled_at?: string | null;
          duration_minutes?: number | null;
          languages?: string[];
          status?: "scheduled" | "active" | "ended";
        };
        Update: Partial<Database["public"]["Tables"]["meetings"]["Insert"]>;
      };
      meeting_participants: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          language: string;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          meeting_id: string;
          user_id: string;
          language: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["meeting_participants"]["Insert"]
        >;
      };
      feedback: {
        Row: {
          id: string;
          user_id: string | null;
          type: "feature" | "bug" | "translation" | "general";
          rating: number | null;
          message: string;
          tags: string[];
          anonymous: boolean;
          status: "open" | "reviewing" | "planned" | "resolved";
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          type: "feature" | "bug" | "translation" | "general";
          rating?: number | null;
          message: string;
          tags?: string[];
          anonymous?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["feedback"]["Insert"]>;
      };
    };
  };
}
