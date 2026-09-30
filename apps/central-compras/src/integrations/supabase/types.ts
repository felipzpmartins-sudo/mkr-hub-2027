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
      approvals: {
        Row: {
          approver_id: string
          created_at: string
          id: string
          justification: string | null
          selected_quote_id: string | null
          selected_quote_ids: string[] | null
          solicitation_id: string
          status: string
        }
        Insert: {
          approver_id: string
          created_at?: string
          id?: string
          justification?: string | null
          selected_quote_id?: string | null
          selected_quote_ids?: string[] | null
          solicitation_id: string
          status?: string
        }
        Update: {
          approver_id?: string
          created_at?: string
          id?: string
          justification?: string | null
          selected_quote_id?: string | null
          selected_quote_ids?: string[] | null
          solicitation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_selected_quote_id_fkey"
            columns: ["selected_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_solicitation_id_fkey"
            columns: ["solicitation_id"]
            isOneToOne: false
            referencedRelation: "solicitations"
            referencedColumns: ["id"]
          },
        ]
      }
      approver_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          approver_id: string
          created_at: string
          id: string
          question: string
          solicitation_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          approver_id: string
          created_at?: string
          id?: string
          question: string
          solicitation_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          approver_id?: string
          created_at?: string
          id?: string
          question?: string
          solicitation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approver_questions_solicitation_id_fkey"
            columns: ["solicitation_id"]
            isOneToOne: false
            referencedRelation: "solicitations"
            referencedColumns: ["id"]
          },
        ]
      }
      approvers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          attachment_type: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          mime_type: string | null
          solicitation_id: string
          uploaded_by: string
        }
        Insert: {
          attachment_type: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          mime_type?: string | null
          solicitation_id: string
          uploaded_by: string
        }
        Update: {
          attachment_type?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          solicitation_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_solicitation_id_fkey"
            columns: ["solicitation_id"]
            isOneToOne: false
            referencedRelation: "solicitations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          product_name: string | null
          solicitation_id: string
          store_name: string | null
          supplier_name: string | null
          uploaded_by: string
          value: number | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          product_name?: string | null
          solicitation_id: string
          store_name?: string | null
          supplier_name?: string | null
          uploaded_by: string
          value?: number | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          product_name?: string | null
          solicitation_id?: string
          store_name?: string | null
          supplier_name?: string | null
          uploaded_by?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_solicitation_id_fkey"
            columns: ["solicitation_id"]
            isOneToOne: false
            referencedRelation: "solicitations"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invoice_file_name: string | null
          invoice_file_path: string | null
          observations: string | null
          receipt_number: number
          solicitation_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invoice_file_name?: string | null
          invoice_file_path?: string | null
          observations?: string | null
          receipt_number?: number
          solicitation_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invoice_file_name?: string | null
          invoice_file_path?: string | null
          observations?: string | null
          receipt_number?: number
          solicitation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_solicitation_id_fkey"
            columns: ["solicitation_id"]
            isOneToOne: false
            referencedRelation: "solicitations"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitation_messages: {
        Row: {
          channel: string
          created_at: string
          id: string
          message: string
          sender_id: string
          solicitation_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
          solicitation_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          solicitation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitation_messages_solicitation_id_fkey"
            columns: ["solicitation_id"]
            isOneToOne: false
            referencedRelation: "solicitations"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitations: {
        Row: {
          accommodation_admin_observation: string | null
          accommodation_check_in: string | null
          accommodation_check_out: string | null
          accommodation_destination_city: string | null
          accommodation_destination_state: string | null
          accommodation_event_address: string | null
          accommodation_guests_count: number | null
          accommodation_guests_data: Json | null
          accommodation_hotel_address: string | null
          accommodation_hotel_contact: string | null
          accommodation_requester_birth_date: string | null
          accommodation_requester_cpf: string | null
          accommodation_selected_hotel: string | null
          accommodation_travel_reason: string | null
          actual_delivery_date: string | null
          admin_justification: string | null
          allocation_location: string | null
          allocation_location_other: string | null
          approval_status: string | null
          approved_count: number | null
          approver_observation: string | null
          created_at: string
          delivered_at: string | null
          delivered_to_name: string | null
          delivered_to_type: string | null
          delivery_observations: string | null
          direct_purchase_date: string | null
          direct_purchase_supplier: string | null
          direct_purchase_value: number | null
          estimated_arrival_date: string | null
          final_order_link: string | null
          flight_departure_date: string | null
          flight_destination: string | null
          flight_estimated_value: number | null
          flight_observations: string | null
          flight_origin: string | null
          flight_preferred_airline: string | null
          flight_proof_attachment: string | null
          flight_return_date: string | null
          flight_search_link: string | null
          flight_time: string | null
          general_description: string | null
          id: string
          invoice_file_name: string | null
          invoice_file_path: string | null
          invoice_number: string | null
          invoice_uploaded_at: string | null
          is_direct_purchase: boolean
          is_urgent: boolean
          items_list: Json | null
          manager_signature_data: string | null
          manager_signature_name: string | null
          material_art_files: string | null
          material_dimensions: string | null
          material_observations: string | null
          material_purpose: string | null
          material_quantity: number | null
          material_size: string | null
          material_type: string | null
          material_type_other: string | null
          material_visual_references: string | null
          missing_items_note: string | null
          missing_items_reported_at: string | null
          missing_items_reported_by: string | null
          picked_up_at: string | null
          picked_up_by: string | null
          product_deliveries: Json
          product_link: string | null
          product_name: string | null
          product_observations: string | null
          product_photo_or_print: string | null
          product_quantity: number | null
          released_at: string | null
          request_type: string
          requester_email: string | null
          requester_name: string
          requester_phone: string
          requester_signature_data: string | null
          requester_signature_name: string | null
          requesting_sector: string | null
          requisition_date: string | null
          responsibility_accepted: boolean | null
          return_deadline: string | null
          return_overdue_notified_at: string | null
          returned_at: string | null
          returned_condition: string | null
          returned_notes: string | null
          returned_received_by: string | null
          status: string
          stock_status: string | null
          updated_at: string
          urgency_justification: string | null
          usage_purpose: string | null
          user_id: string
          veto_at: string | null
          veto_by: string | null
          veto_count: number
          veto_reason: string | null
        }
        Insert: {
          accommodation_admin_observation?: string | null
          accommodation_check_in?: string | null
          accommodation_check_out?: string | null
          accommodation_destination_city?: string | null
          accommodation_destination_state?: string | null
          accommodation_event_address?: string | null
          accommodation_guests_count?: number | null
          accommodation_guests_data?: Json | null
          accommodation_hotel_address?: string | null
          accommodation_hotel_contact?: string | null
          accommodation_requester_birth_date?: string | null
          accommodation_requester_cpf?: string | null
          accommodation_selected_hotel?: string | null
          accommodation_travel_reason?: string | null
          actual_delivery_date?: string | null
          admin_justification?: string | null
          allocation_location?: string | null
          allocation_location_other?: string | null
          approval_status?: string | null
          approved_count?: number | null
          approver_observation?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_to_name?: string | null
          delivered_to_type?: string | null
          delivery_observations?: string | null
          direct_purchase_date?: string | null
          direct_purchase_supplier?: string | null
          direct_purchase_value?: number | null
          estimated_arrival_date?: string | null
          final_order_link?: string | null
          flight_departure_date?: string | null
          flight_destination?: string | null
          flight_estimated_value?: number | null
          flight_observations?: string | null
          flight_origin?: string | null
          flight_preferred_airline?: string | null
          flight_proof_attachment?: string | null
          flight_return_date?: string | null
          flight_search_link?: string | null
          flight_time?: string | null
          general_description?: string | null
          id?: string
          invoice_file_name?: string | null
          invoice_file_path?: string | null
          invoice_number?: string | null
          invoice_uploaded_at?: string | null
          is_direct_purchase?: boolean
          is_urgent?: boolean
          items_list?: Json | null
          manager_signature_data?: string | null
          manager_signature_name?: string | null
          material_art_files?: string | null
          material_dimensions?: string | null
          material_observations?: string | null
          material_purpose?: string | null
          material_quantity?: number | null
          material_size?: string | null
          material_type?: string | null
          material_type_other?: string | null
          material_visual_references?: string | null
          missing_items_note?: string | null
          missing_items_reported_at?: string | null
          missing_items_reported_by?: string | null
          picked_up_at?: string | null
          picked_up_by?: string | null
          product_deliveries?: Json
          product_link?: string | null
          product_name?: string | null
          product_observations?: string | null
          product_photo_or_print?: string | null
          product_quantity?: number | null
          released_at?: string | null
          request_type: string
          requester_email?: string | null
          requester_name: string
          requester_phone: string
          requester_signature_data?: string | null
          requester_signature_name?: string | null
          requesting_sector?: string | null
          requisition_date?: string | null
          responsibility_accepted?: boolean | null
          return_deadline?: string | null
          return_overdue_notified_at?: string | null
          returned_at?: string | null
          returned_condition?: string | null
          returned_notes?: string | null
          returned_received_by?: string | null
          status?: string
          stock_status?: string | null
          updated_at?: string
          urgency_justification?: string | null
          usage_purpose?: string | null
          user_id: string
          veto_at?: string | null
          veto_by?: string | null
          veto_count?: number
          veto_reason?: string | null
        }
        Update: {
          accommodation_admin_observation?: string | null
          accommodation_check_in?: string | null
          accommodation_check_out?: string | null
          accommodation_destination_city?: string | null
          accommodation_destination_state?: string | null
          accommodation_event_address?: string | null
          accommodation_guests_count?: number | null
          accommodation_guests_data?: Json | null
          accommodation_hotel_address?: string | null
          accommodation_hotel_contact?: string | null
          accommodation_requester_birth_date?: string | null
          accommodation_requester_cpf?: string | null
          accommodation_selected_hotel?: string | null
          accommodation_travel_reason?: string | null
          actual_delivery_date?: string | null
          admin_justification?: string | null
          allocation_location?: string | null
          allocation_location_other?: string | null
          approval_status?: string | null
          approved_count?: number | null
          approver_observation?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_to_name?: string | null
          delivered_to_type?: string | null
          delivery_observations?: string | null
          direct_purchase_date?: string | null
          direct_purchase_supplier?: string | null
          direct_purchase_value?: number | null
          estimated_arrival_date?: string | null
          final_order_link?: string | null
          flight_departure_date?: string | null
          flight_destination?: string | null
          flight_estimated_value?: number | null
          flight_observations?: string | null
          flight_origin?: string | null
          flight_preferred_airline?: string | null
          flight_proof_attachment?: string | null
          flight_return_date?: string | null
          flight_search_link?: string | null
          flight_time?: string | null
          general_description?: string | null
          id?: string
          invoice_file_name?: string | null
          invoice_file_path?: string | null
          invoice_number?: string | null
          invoice_uploaded_at?: string | null
          is_direct_purchase?: boolean
          is_urgent?: boolean
          items_list?: Json | null
          manager_signature_data?: string | null
          manager_signature_name?: string | null
          material_art_files?: string | null
          material_dimensions?: string | null
          material_observations?: string | null
          material_purpose?: string | null
          material_quantity?: number | null
          material_size?: string | null
          material_type?: string | null
          material_type_other?: string | null
          material_visual_references?: string | null
          missing_items_note?: string | null
          missing_items_reported_at?: string | null
          missing_items_reported_by?: string | null
          picked_up_at?: string | null
          picked_up_by?: string | null
          product_deliveries?: Json
          product_link?: string | null
          product_name?: string | null
          product_observations?: string | null
          product_photo_or_print?: string | null
          product_quantity?: number | null
          released_at?: string | null
          request_type?: string
          requester_email?: string | null
          requester_name?: string
          requester_phone?: string
          requester_signature_data?: string | null
          requester_signature_name?: string | null
          requesting_sector?: string | null
          requisition_date?: string | null
          responsibility_accepted?: boolean | null
          return_deadline?: string | null
          return_overdue_notified_at?: string | null
          returned_at?: string | null
          returned_condition?: string | null
          returned_notes?: string | null
          returned_received_by?: string | null
          status?: string
          stock_status?: string | null
          updated_at?: string
          urgency_justification?: string | null
          usage_purpose?: string | null
          user_id?: string
          veto_at?: string | null
          veto_by?: string | null
          veto_count?: number
          veto_reason?: string | null
        }
        Relationships: []
      }
      status_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          justification: string | null
          new_status: string
          old_status: string | null
          solicitation_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          justification?: string | null
          new_status: string
          old_status?: string | null
          solicitation_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          justification?: string | null
          new_status?: string
          old_status?: string | null
          solicitation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_solicitation_id_fkey"
            columns: ["solicitation_id"]
            isOneToOne: false
            referencedRelation: "solicitations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          performed_by: string | null
          performed_by_name: string | null
          solicitation_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
          performed_by_name?: string | null
          solicitation_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
          performed_by_name?: string | null
          solicitation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_activity_log_solicitation_id_fkey"
            columns: ["solicitation_id"]
            isOneToOne: false
            referencedRelation: "solicitations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_approver_display_name: { Args: { _user_id: string }; Returns: string }
      has_admin_role: { Args: { _user_id: string }; Returns: boolean }
      is_veto_approver: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_has_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
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
