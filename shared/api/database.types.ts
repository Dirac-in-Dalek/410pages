export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      author_folder_memberships: {
        Row: {
          author_id: string
          created_at: string
          folder_id: string
          user_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          folder_id: string
          user_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          folder_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "author_folder_memberships_author_id_fkey"
            columns: ["author_id", "user_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "author_folder_memberships_folder_id_fkey"
            columns: ["folder_id", "user_id"]
            isOneToOne: false
            referencedRelation: "author_folders"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      author_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_index: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_index?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_index?: number
          user_id?: string
        }
        Relationships: []
      }
      authors: {
        Row: {
          created_at: string
          id: string
          is_self: boolean
          name: string
          sort_index: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_self?: boolean
          name: string
          sort_index?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_self?: boolean
          name?: string
          sort_index?: number
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          author_id: string
          created_at: string
          id: string
          memo: string
          memo_formats: Json
          sort_index: number
          title: string
          user_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          memo?: string
          memo_formats?: Json
          sort_index?: number
          title: string
          user_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          memo?: string
          memo_formats?: Json
          sort_index?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_author_id_fkey"
            columns: ["author_id", "user_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      chapter_blocks: {
        Row: {
          book_id: string
          created_at: string
          created_at_sort: number
          depth: number
          id: string
          label: string
          order_key: string | null
          page_sort: number | null
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          created_at_sort: number
          depth?: number
          id?: string
          label: string
          order_key?: string | null
          page_sort?: number | null
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          created_at_sort?: number
          depth?: number
          id?: string
          label?: string
          order_key?: string | null
          page_sort?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_blocks_book_id_fkey"
            columns: ["book_id", "user_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      citations: {
        Row: {
          author_id: string | null
          book_id: string | null
          created_at: string
          created_at_sort: number | null
          highlights: Json | null
          id: string
          kind: string
          order_key: string | null
          page: string | null
          page_sort: number | null
          text: string
          text_formats: Json
          user_id: string
        }
        Insert: {
          author_id?: string | null
          book_id?: string | null
          created_at?: string
          created_at_sort?: number | null
          highlights?: Json | null
          id?: string
          kind?: string
          order_key?: string | null
          page?: string | null
          page_sort?: number | null
          text: string
          text_formats?: Json
          user_id: string
        }
        Update: {
          author_id?: string | null
          book_id?: string | null
          created_at?: string
          created_at_sort?: number | null
          highlights?: Json | null
          id?: string
          kind?: string
          order_key?: string | null
          page?: string | null
          page_sort?: number | null
          text?: string
          text_formats?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "citations_author_id_fkey"
            columns: ["author_id", "user_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "citations_book_id_fkey"
            columns: ["book_id", "user_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      notes: {
        Row: {
          citation_id: string
          content: string
          created_at: string
          id: string
          text_formats: Json
          user_id: string
        }
        Insert: {
          citation_id: string
          content: string
          created_at?: string
          id?: string
          text_formats?: Json
          user_id: string
        }
        Update: {
          citation_id?: string
          content?: string
          created_at?: string
          id?: string
          text_formats?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_citation_id_fkey"
            columns: ["citation_id", "user_id"]
            isOneToOne: false
            referencedRelation: "citations"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          avatar_url: string | null
          created_at: string
          id: string
          preferences: Json | null
          username: string | null
        }
        Insert: {
          avatar_path?: string | null
          avatar_url?: string | null
          created_at?: string
          id: string
          preferences?: Json | null
          username?: string | null
        }
        Update: {
          avatar_path?: string | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          preferences?: Json | null
          username?: string | null
        }
        Relationships: []
      }
      project_citations: {
        Row: {
          citation_id: string
          project_id: string
        }
        Insert: {
          citation_id: string
          project_id: string
        }
        Update: {
          citation_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_citations_citation_id_fkey"
            columns: ["citation_id"]
            isOneToOne: false
            referencedRelation: "citations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_citations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_index: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_index?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_index?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_legacy_order_key: { Args: { value: number }; Returns: string }
      book_order_key_after: {
        Args: { lower_key: string; upper_key?: string }
        Returns: string
      }
      book_order_key_is_valid: { Args: { value: string }; Returns: boolean }
      bulk_update_citation_source: {
        Args: {
          citation_ids: string[]
          destination_author_id: string
          destination_book_id: string
          destination_order_keys: Json
          expected_positions: Json
          expected_user_id: string
        }
        Returns: {
          id: string
          order_key: string
        }[]
      }
      check_email_exists: { Args: { email_to_check: string }; Returns: boolean }
      create_project_with_citations: {
        Args: {
          citation_ids?: string[]
          expected_user_id: string
          requested_name: string
          requested_project_id: string
        }
        Returns: Json
      }
      delete_author_cascade: {
        Args: { expected_user_id: string; source_author_id: string }
        Returns: Json
      }
      delete_book_cascade: {
        Args: { expected_user_id: string; source_book_id: string }
        Returns: Json
      }
      get_or_create_author: {
        Args: { expected_user_id: string; requested_name: string }
        Returns: Json
      }
      get_or_create_book: {
        Args: {
          expected_user_id: string
          requested_title: string
          source_author_id: string
        }
        Returns: Json
      }
      merge_book_memo_formats: {
        Args: {
          source_formats: Json
          source_text: string
          target_formats: Json
          target_text: string
        }
        Returns: Json
      }
      preview_author_deletion: {
        Args: { expected_user_id: string; source_author_id: string }
        Returns: Json
      }
      preview_book_deletion: {
        Args: { expected_user_id: string; source_book_id: string }
        Returns: Json
      }
      rename_or_merge_author: {
        Args: { requested_name: string; source_author_id: string }
        Returns: Json
      }
      rename_or_merge_author_with_folder: {
        Args: { requested_name: string; source_author_id: string }
        Returns: Json
      }
      rename_or_merge_book: {
        Args: { requested_title: string; source_book_id: string }
        Returns: Json
      }
      reorder_authors: {
        Args: { ordered_author_ids: string[] }
        Returns: undefined
      }
      reorder_books: {
        Args: { ordered_book_ids: string[]; source_author_id: string }
        Returns: undefined
      }
      reorder_projects: {
        Args: { expected_user_id: string; ordered_project_ids: string[] }
        Returns: Json
      }
      save_text_formatting: {
        Args: {
          expected_text: string
          requested_formats: Json
          requested_text: string
          target_id: string
          target_kind: string
        }
        Returns: undefined
      }
      text_formats_are_valid: {
        Args: { formats: Json; value: string }
        Returns: boolean
      }
      text_utf16_length: { Args: { value: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
