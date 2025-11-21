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
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_user_email: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_badges: {
        Row: {
          badge_code: string
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          tier: string
        }
        Insert: {
          badge_code: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          tier: string
        }
        Update: {
          badge_code?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          tier?: string
        }
        Relationships: []
      }
      admin_earned_badges: {
        Row: {
          admin_user_id: string
          badge_id: string
          earned_at: string | null
          id: string
        }
        Insert: {
          admin_user_id: string
          badge_id: string
          earned_at?: string | null
          id?: string
        }
        Update: {
          admin_user_id?: string
          badge_id?: string
          earned_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_earned_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "admin_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_performance_scores: {
        Row: {
          admin_user_id: string
          avg_response_time_minutes: number | null
          created_at: string | null
          efficiency_score: number | null
          experience_points: number | null
          id: string
          last_activity_date: string | null
          level: number | null
          overall_score: number | null
          quality_score: number | null
          rank: number | null
          streak_days: number | null
          total_actions: number | null
          updated_at: string | null
        }
        Insert: {
          admin_user_id: string
          avg_response_time_minutes?: number | null
          created_at?: string | null
          efficiency_score?: number | null
          experience_points?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          overall_score?: number | null
          quality_score?: number | null
          rank?: number | null
          streak_days?: number | null
          total_actions?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string
          avg_response_time_minutes?: number | null
          created_at?: string | null
          efficiency_score?: number | null
          experience_points?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          overall_score?: number | null
          quality_score?: number | null
          rank?: number | null
          streak_days?: number | null
          total_actions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      alert_history: {
        Row: {
          alert_setting_id: string | null
          alert_type: string
          error_message: string | null
          event_data: Json | null
          id: string
          message: string
          notification_channels: string[] | null
          sent_successfully: boolean | null
          severity: string
          title: string
          triggered_at: string | null
        }
        Insert: {
          alert_setting_id?: string | null
          alert_type: string
          error_message?: string | null
          event_data?: Json | null
          id?: string
          message: string
          notification_channels?: string[] | null
          sent_successfully?: boolean | null
          severity: string
          title: string
          triggered_at?: string | null
        }
        Update: {
          alert_setting_id?: string | null
          alert_type?: string
          error_message?: string | null
          event_data?: Json | null
          id?: string
          message?: string
          notification_channels?: string[] | null
          sent_successfully?: boolean | null
          severity?: string
          title?: string
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_alert_setting_id_fkey"
            columns: ["alert_setting_id"]
            isOneToOne: false
            referencedRelation: "alert_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_settings: {
        Row: {
          alert_name: string
          alert_type: string
          cooldown_minutes: number | null
          created_at: string | null
          email_recipients: string[] | null
          enabled: boolean | null
          id: string
          last_triggered_at: string | null
          notification_channels: string[] | null
          severity_threshold: string[] | null
          slack_channel: string | null
          slack_webhook_url: string | null
          sms_recipients: string[] | null
          updated_at: string | null
        }
        Insert: {
          alert_name: string
          alert_type: string
          cooldown_minutes?: number | null
          created_at?: string | null
          email_recipients?: string[] | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          notification_channels?: string[] | null
          severity_threshold?: string[] | null
          slack_channel?: string | null
          slack_webhook_url?: string | null
          sms_recipients?: string[] | null
          updated_at?: string | null
        }
        Update: {
          alert_name?: string
          alert_type?: string
          cooldown_minutes?: number | null
          created_at?: string | null
          email_recipients?: string[] | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          notification_channels?: string[] | null
          severity_threshold?: string[] | null
          slack_channel?: string | null
          slack_webhook_url?: string | null
          sms_recipients?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      anomaly_detection_settings: {
        Row: {
          created_at: string | null
          enabled: boolean
          id: string
          learning_period_days: number
          min_data_points: number
          sensitivity_level: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          learning_period_days?: number
          min_data_points?: number
          sensitivity_level?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          learning_period_days?: number
          min_data_points?: number
          sensitivity_level?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          business_partner_id: string
          created_at: string | null
          endpoint: string
          id: string
          method: string
          response_time_ms: number | null
          status_code: number
        }
        Insert: {
          business_partner_id: string
          created_at?: string | null
          endpoint: string
          id?: string
          method: string
          response_time_ms?: number | null
          status_code: number
        }
        Update: {
          business_partner_id?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          method?: string
          response_time_ms?: number | null
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_business_partner_id_fkey"
            columns: ["business_partner_id"]
            isOneToOne: false
            referencedRelation: "business_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_activity_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          archived_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          original_created_at: string
          original_log_id: string
          target_user_email: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          archived_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          original_created_at: string
          original_log_id: string
          target_user_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          archived_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          original_created_at?: string
          original_log_id?: string
          target_user_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      business_partners: {
        Row: {
          api_key: string | null
          approved_at: string | null
          approved_by: string | null
          business_description: string | null
          business_name: string
          callback_url: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          return_url: string
          status: string
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          api_key?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_description?: string | null
          business_name: string
          callback_url: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          return_url: string
          status?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          api_key?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_description?: string | null
          business_name?: string
          callback_url?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          return_url?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          id: string
          session_id: string | null
          used_at: string | null
          user_email: string | null
        }
        Insert: {
          coupon_id: string
          id?: string
          session_id?: string | null
          used_at?: string | null
          user_email?: string | null
        }
        Update: {
          coupon_id?: string
          id?: string
          session_id?: string | null
          used_at?: string | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_percentage: number | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          multi_use: boolean | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_percentage?: number | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          multi_use?: boolean | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_percentage?: number | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          multi_use?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      detected_anomalies: {
        Row: {
          admin_user_id: string
          anomaly_type: string
          confidence_score: number
          created_at: string | null
          description: string
          detected_at: string | null
          id: string
          notes: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          supporting_data: Json | null
        }
        Insert: {
          admin_user_id: string
          anomaly_type: string
          confidence_score: number
          created_at?: string | null
          description: string
          detected_at?: string | null
          id?: string
          notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          supporting_data?: Json | null
        }
        Update: {
          admin_user_id?: string
          anomaly_type?: string
          confidence_score?: number
          created_at?: string | null
          description?: string
          detected_at?: string | null
          id?: string
          notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          supporting_data?: Json | null
        }
        Relationships: []
      }
      email_digest_history: {
        Row: {
          error_message: string | null
          frequency: string
          id: string
          recipients: string[]
          sent_at: string | null
          success: boolean
          summary_data: Json | null
        }
        Insert: {
          error_message?: string | null
          frequency: string
          id?: string
          recipients: string[]
          sent_at?: string | null
          success?: boolean
          summary_data?: Json | null
        }
        Update: {
          error_message?: string | null
          frequency?: string
          id?: string
          recipients?: string[]
          sent_at?: string | null
          success?: boolean
          summary_data?: Json | null
        }
        Relationships: []
      }
      email_digest_recipients: {
        Row: {
          active: boolean
          created_at: string | null
          email: string
          id: string
          name: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      email_digest_settings: {
        Row: {
          created_at: string | null
          enabled: boolean
          frequency: string
          id: string
          include_activity_summary: boolean
          include_anomaly_report: boolean
          include_comparison_charts: boolean
          include_performance_metrics: boolean
          last_sent_at: string | null
          send_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          include_activity_summary?: boolean
          include_anomaly_report?: boolean
          include_comparison_charts?: boolean
          include_performance_metrics?: boolean
          last_sent_at?: string | null
          send_time?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          include_activity_summary?: boolean
          include_anomaly_report?: boolean
          include_comparison_charts?: boolean
          include_performance_metrics?: boolean
          last_sent_at?: string | null
          send_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          notification_type: string
          recipient_email: string
          recipient_user_id: string | null
          resend_message_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_data: Json | null
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type: string
          recipient_email: string
          recipient_user_id?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_data?: Json | null
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          recipient_email?: string
          recipient_user_id?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_data?: Json | null
          template_name?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          error_type: string
          id: string
          ip_address: string | null
          message: string
          occurred_at: string
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          stack_trace: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error_type: string
          id?: string
          ip_address?: string | null
          message: string
          occurred_at?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          stack_trace?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          error_type?: string
          id?: string
          ip_address?: string | null
          message?: string
          occurred_at?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          stack_trace?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      legal_agreements: {
        Row: {
          created_at: string
          id: string
          leo_declaration_signed: boolean | null
          signature_agreement_signed: boolean | null
          signature_data: string | null
          vai_assignment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leo_declaration_signed?: boolean | null
          signature_agreement_signed?: boolean | null
          signature_data?: string | null
          vai_assignment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leo_declaration_signed?: boolean | null
          signature_agreement_signed?: boolean | null
          signature_data?: string | null
          vai_assignment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_agreements_vai_assignment_id_fkey"
            columns: ["vai_assignment_id"]
            isOneToOne: false
            referencedRelation: "vai_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string | null
          stripe_payment_intent_id: string | null
          verification_record_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          verification_record_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          verification_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_verification_record_id_fkey"
            columns: ["verification_record_id"]
            isOneToOne: false
            referencedRelation: "verification_records"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          base_price: number
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          product_name: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          product_name: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          product_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      retention_policies: {
        Row: {
          archive_before_delete: boolean
          auto_delete_enabled: boolean
          created_at: string | null
          id: string
          last_run_at: string | null
          policy_name: string
          retention_days: number
          updated_at: string | null
        }
        Insert: {
          archive_before_delete?: boolean
          auto_delete_enabled?: boolean
          created_at?: string | null
          id?: string
          last_run_at?: string | null
          policy_name?: string
          retention_days?: number
          updated_at?: string | null
        }
        Update: {
          archive_before_delete?: boolean
          auto_delete_enabled?: boolean
          created_at?: string | null
          id?: string
          last_run_at?: string | null
          policy_name?: string
          retention_days?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      sandbox_test_scenarios: {
        Row: {
          business_partner_id: string | null
          configuration: Json
          created_at: string
          description: string | null
          expected_results: Json | null
          id: string
          is_public: boolean | null
          mock_data: Json | null
          name: string
          tags: string[] | null
          test_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_partner_id?: string | null
          configuration?: Json
          created_at?: string
          description?: string | null
          expected_results?: Json | null
          id?: string
          is_public?: boolean | null
          mock_data?: Json | null
          name: string
          tags?: string[] | null
          test_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_partner_id?: string | null
          configuration?: Json
          created_at?: string
          description?: string | null
          expected_results?: Json | null
          id?: string
          is_public?: boolean | null
          mock_data?: Json | null
          name?: string
          tags?: string[] | null
          test_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sandbox_test_scenarios_business_partner_id_fkey"
            columns: ["business_partner_id"]
            isOneToOne: false
            referencedRelation: "business_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_attempts: {
        Row: {
          attempted_at: string
          contract_type: string
          device_fingerprint: string | null
          facial_match_confidence: number | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          vai_number: string
        }
        Insert: {
          attempted_at?: string
          contract_type: string
          device_fingerprint?: string | null
          facial_match_confidence?: number | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          vai_number: string
        }
        Update: {
          attempted_at?: string
          contract_type?: string
          device_fingerprint?: string | null
          facial_match_confidence?: number | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          vai_number?: string
        }
        Relationships: []
      }
      signed_contracts: {
        Row: {
          blockchain_hash: string | null
          contract_id: string
          contract_text: string
          contract_type: string
          created_at: string
          facial_match_confidence: number
          id: string
          ip_address: string | null
          signed_at: string
          updated_at: string
          user_agent: string | null
          vai_number: string
        }
        Insert: {
          blockchain_hash?: string | null
          contract_id?: string
          contract_text: string
          contract_type: string
          created_at?: string
          facial_match_confidence: number
          id?: string
          ip_address?: string | null
          signed_at?: string
          updated_at?: string
          user_agent?: string | null
          vai_number: string
        }
        Update: {
          blockchain_hash?: string | null
          contract_id?: string
          contract_text?: string
          contract_type?: string
          created_at?: string
          facial_match_confidence?: number
          id?: string
          ip_address?: string | null
          signed_at?: string
          updated_at?: string
          user_agent?: string | null
          vai_number?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          email_digest_frequency: string | null
          id: string
          language: string | null
          notifications_enabled: boolean | null
          preferences: Json | null
          theme: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_digest_frequency?: string | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          preferences?: Json | null
          theme?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_digest_frequency?: string | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          preferences?: Json | null
          theme?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vai_assignments: {
        Row: {
          created_at: string
          id: string
          status: string | null
          vai_code: string
          verification_record_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string | null
          vai_code: string
          verification_record_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string | null
          vai_code?: string
          verification_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vai_assignments_verification_record_id_fkey"
            columns: ["verification_record_id"]
            isOneToOne: false
            referencedRelation: "verification_records"
            referencedColumns: ["id"]
          },
        ]
      }
      vai_status_updates: {
        Row: {
          created_at: string
          id: string
          status_data: Json | null
          status_type: string
          vai_number: string
          webhook_event_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status_data?: Json | null
          status_type: string
          vai_number: string
          webhook_event_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status_data?: Json | null
          status_type?: string
          vai_number?: string
          webhook_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vai_status_updates_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "vairify_webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      vairify_webhook_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          signature: string | null
          user_id: string
          vai_number: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          signature?: string | null
          user_id: string
          vai_number: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          signature?: string | null
          user_id?: string
          vai_number?: string
        }
        Relationships: []
      }
      verification_records: {
        Row: {
          biometric_confirmed: boolean | null
          complycube_client_id: string | null
          complycube_session_id: string | null
          complycube_verification_id: string | null
          created_at: string
          final_verification_completed: boolean | null
          id: string
          id_document_url: string | null
          le_disclosure_accepted: boolean | null
          mutual_consent_accepted: boolean | null
          selfie_url: string | null
          session_id: string
          signed_contract_id: string | null
          terms_accepted: boolean | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          biometric_confirmed?: boolean | null
          complycube_client_id?: string | null
          complycube_session_id?: string | null
          complycube_verification_id?: string | null
          created_at?: string
          final_verification_completed?: boolean | null
          id?: string
          id_document_url?: string | null
          le_disclosure_accepted?: boolean | null
          mutual_consent_accepted?: boolean | null
          selfie_url?: string | null
          session_id: string
          signed_contract_id?: string | null
          terms_accepted?: boolean | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          biometric_confirmed?: boolean | null
          complycube_client_id?: string | null
          complycube_session_id?: string | null
          complycube_verification_id?: string | null
          created_at?: string
          final_verification_completed?: boolean | null
          id?: string
          id_document_url?: string | null
          le_disclosure_accepted?: boolean | null
          mutual_consent_accepted?: boolean | null
          selfie_url?: string | null
          session_id?: string
          signed_contract_id?: string | null
          terms_accepted?: boolean | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      webhook_delivery_queue: {
        Row: {
          attempts: number
          business_partner_id: string | null
          callback_url: string
          completed_at: string | null
          created_at: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          response_time_ms: number | null
          status: string
        }
        Insert: {
          attempts?: number
          business_partner_id?: string | null
          callback_url: string
          completed_at?: string | null
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          status?: string
        }
        Update: {
          attempts?: number
          business_partner_id?: string | null
          callback_url?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_delivery_queue_business_partner_id_fkey"
            columns: ["business_partner_id"]
            isOneToOne: false
            referencedRelation: "business_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_replay_history: {
        Row: {
          error_message: string | null
          id: string
          original_webhook_id: string | null
          payload: Json
          replayed_at: string
          replayed_by: string | null
          response_body: string | null
          response_status: number | null
          response_time_ms: number | null
          success: boolean
          target_url: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          original_webhook_id?: string | null
          payload: Json
          replayed_at?: string
          replayed_by?: string | null
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          success: boolean
          target_url: string
        }
        Update: {
          error_message?: string | null
          id?: string
          original_webhook_id?: string | null
          payload?: Json
          replayed_at?: string
          replayed_by?: string | null
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          success?: boolean
          target_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_replay_history_original_webhook_id_fkey"
            columns: ["original_webhook_id"]
            isOneToOne: false
            referencedRelation: "vairify_webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_test_history: {
        Row: {
          business_partner_id: string
          callback_url: string
          created_at: string | null
          error_message: string | null
          id: string
          response_body: string | null
          response_status: number | null
          response_time_ms: number | null
          success: boolean
          test_payload: Json
        }
        Insert: {
          business_partner_id: string
          callback_url: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          success?: boolean
          test_payload: Json
        }
        Update: {
          business_partner_id?: string
          callback_url?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          success?: boolean
          test_payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "webhook_test_history_business_partner_id_fkey"
            columns: ["business_partner_id"]
            isOneToOne: false
            referencedRelation: "business_partners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
