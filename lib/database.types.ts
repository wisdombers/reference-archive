export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      boards: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      references: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_url: string;
          thumbnail_url: string | null;
          summary: string | null;
          tags: string[];
          note: string | null;
          is_favorite: boolean;
          memo?: string | null;
          importance?: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          source_url: string;
          thumbnail_url?: string | null;
          summary?: string | null;
          tags?: string[];
          note?: string | null;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          source_url?: string;
          thumbnail_url?: string | null;
          summary?: string | null;
          tags?: string[];
          note?: string | null;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "references_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      reference_boards: {
        Row: {
          id: string;
          reference_id: string;
          board_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reference_id: string;
          board_id: string;
          user_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          reference_id?: string;
          board_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reference_boards_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reference_boards_reference_id_fkey";
            columns: ["reference_id"];
            isOneToOne: false;
            referencedRelation: "references";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reference_boards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};

export type Reference = Database["public"]["Tables"]["references"]["Row"];
export type ReferenceInsert = Database["public"]["Tables"]["references"]["Insert"];
export type ReferenceUpdate = Database["public"]["Tables"]["references"]["Update"];
export type Board = Database["public"]["Tables"]["boards"]["Row"];
export type ReferenceBoard = Database["public"]["Tables"]["reference_boards"]["Row"];
