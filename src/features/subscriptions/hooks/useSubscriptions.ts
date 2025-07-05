import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../auth/useAuth'
import { calculateNextPaymentDate } from '../../../lib/utils/calculations'
import { isBefore, startOfDay } from 'date-fns'
import type { Database } from '../../../types/database.types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

export function useSubscriptions() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('next_payment_date', { ascending: true })

      if (error) throw error
      
      const subscriptions = data as Subscription[]
      const now = startOfDay(new Date())
      const updatedSubscriptions: Subscription[] = []
      
      // Check each subscription for past payment dates and auto-renew
      for (const subscription of subscriptions) {
        const paymentDate = startOfDay(new Date(subscription.next_payment_date))
        
        if (isBefore(paymentDate, now)) {
          // Payment date is in the past, calculate new date
          const newPaymentDate = calculateNextPaymentDate(paymentDate, subscription.billing_period)
          
          // Update the subscription in the database
          const { data: updatedData, error: updateError } = await supabase
            .from('subscriptions')
            .update({ 
              next_payment_date: newPaymentDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id)
            .select()
            .single()
          
          if (updateError) {
            console.error('Failed to update subscription:', updateError)
            updatedSubscriptions.push(subscription) // Keep original if update fails
          } else {
            updatedSubscriptions.push(updatedData as Subscription)
          }
        } else {
          updatedSubscriptions.push(subscription)
        }
      }
      
      // Re-sort by next_payment_date after updates
      return updatedSubscriptions.sort((a, b) => 
        new Date(a.next_payment_date).getTime() - new Date(b.next_payment_date).getTime()
      )
    },
    enabled: !!user,
  })
}

export function useCreateSubscription() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (subscription: Omit<SubscriptionInsert, 'user_id'>) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('subscriptions')
        .insert({ ...subscription, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: SubscriptionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })
}