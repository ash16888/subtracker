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
          category: string | null
          url: string | null
          user_id: string
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
          category?: string | null
          url?: string | null
          user_id: string
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
          category?: string | null
          url?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
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
    }
  }
}