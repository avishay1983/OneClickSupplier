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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      vendor_documents: {
        Row: {
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_path: string
          id: string
          uploaded_at: string
          vendor_request_id: string
        }
        Insert: {
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_path: string
          id?: string
          uploaded_at?: string
          vendor_request_id: string
        }
        Update: {
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_path?: string
          id?: string
          uploaded_at?: string
          vendor_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_documents_vendor_request_id_fkey"
            columns: ["vendor_request_id"]
            isOneToOne: false
            referencedRelation: "vendor_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_requests: {
        Row: {
          accounting_contact_name: string | null
          accounting_contact_phone: string | null
          approver_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          city: string | null
          company_id: string | null
          contract_signed: boolean | null
          created_at: string
          expected_spending: number | null
          fax: string | null
          id: string
          is_consultant: boolean | null
          is_sensitive: boolean | null
          legal_approved: boolean | null
          mobile: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_terms: string | null
          phone: string | null
          po_box: string | null
          postal_code: string | null
          quote_received: boolean | null
          sales_contact_name: string | null
          sales_contact_phone: string | null
          secure_token: string
          status: Database["public"]["Enums"]["vendor_status"]
          street: string | null
          street_number: string | null
          updated_at: string
          vendor_email: string
          vendor_name: string
        }
        Insert: {
          accounting_contact_name?: string | null
          accounting_contact_phone?: string | null
          approver_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          city?: string | null
          company_id?: string | null
          contract_signed?: boolean | null
          created_at?: string
          expected_spending?: number | null
          fax?: string | null
          id?: string
          is_consultant?: boolean | null
          is_sensitive?: boolean | null
          legal_approved?: boolean | null
          mobile?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_terms?: string | null
          phone?: string | null
          po_box?: string | null
          postal_code?: string | null
          quote_received?: boolean | null
          sales_contact_name?: string | null
          sales_contact_phone?: string | null
          secure_token?: string
          status?: Database["public"]["Enums"]["vendor_status"]
          street?: string | null
          street_number?: string | null
          updated_at?: string
          vendor_email: string
          vendor_name: string
        }
        Update: {
          accounting_contact_name?: string | null
          accounting_contact_phone?: string | null
          approver_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          city?: string | null
          company_id?: string | null
          contract_signed?: boolean | null
          created_at?: string
          expected_spending?: number | null
          fax?: string | null
          id?: string
          is_consultant?: boolean | null
          is_sensitive?: boolean | null
          legal_approved?: boolean | null
          mobile?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_terms?: string | null
          phone?: string | null
          po_box?: string | null
          postal_code?: string | null
          quote_received?: boolean | null
          sales_contact_name?: string | null
          sales_contact_phone?: string | null
          secure_token?: string
          status?: Database["public"]["Enums"]["vendor_status"]
          street?: string | null
          street_number?: string | null
          updated_at?: string
          vendor_email?: string
          vendor_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_type:
        | "bookkeeping_cert"
        | "tax_cert"
        | "bank_confirmation"
        | "invoice_screenshot"
      payment_method: "check" | "invoice" | "transfer"
      vendor_status: "pending" | "with_vendor" | "submitted" | "approved"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      document_type: [
        "bookkeeping_cert",
        "tax_cert",
        "bank_confirmation",
        "invoice_screenshot",
      ],
      payment_method: ["check", "invoice", "transfer"],
      vendor_status: ["pending", "with_vendor", "submitted", "approved"],
    },
  },
} as const
