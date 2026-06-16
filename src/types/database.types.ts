export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      subscriptions: {
        Row: {
          id: string
          name: string
          amount: number
          currency: string
          billing_period: 'monthly' | 'yearly'
          next_payment_date: string
          status: 'active' | 'trial' | 'paused' | 'canceled' | 'archived'
          category: string | null
          url: string | null
          user_id: string
          google_calendar_event_id: string | null
          calendar_sync_status: 'not_connected' | 'pending' | 'synced' | 'error' | 'disabled'
          calendar_sync_error: string | null
          calendar_sync_attempted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          amount: number
          currency: string
          billing_period: 'monthly' | 'yearly'
          next_payment_date: string
          status?: 'active' | 'trial' | 'paused' | 'canceled' | 'archived'
          category?: string | null
          url?: string | null
          user_id: string
          google_calendar_event_id?: string | null
          calendar_sync_status?: 'not_connected' | 'pending' | 'synced' | 'error' | 'disabled'
          calendar_sync_error?: string | null
          calendar_sync_attempted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          amount?: number
          currency?: string
          billing_period?: 'monthly' | 'yearly'
          next_payment_date?: string
          status?: 'active' | 'trial' | 'paused' | 'canceled' | 'archived'
          category?: string | null
          url?: string | null
          user_id?: string
          google_calendar_event_id?: string | null
          calendar_sync_status?: 'not_connected' | 'pending' | 'synced' | 'error' | 'disabled'
          calendar_sync_error?: string | null
          calendar_sync_attempted_at?: string | null
          created_at?: string
          updated_at?: string
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
      billing_period: 'monthly' | 'yearly'
      subscription_status: 'active' | 'trial' | 'paused' | 'canceled' | 'archived'
      calendar_sync_status: 'not_connected' | 'pending' | 'synced' | 'error' | 'disabled'
    }
  }
}
