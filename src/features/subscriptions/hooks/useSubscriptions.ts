import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../auth/useAuth'
import { calculateUpcomingPaymentDate } from '../../../lib/utils/calculations'
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
      
      const subscriptions = (data as Subscription[]).map(subscription => {
        const upcomingPaymentDate = calculateUpcomingPaymentDate(
          new Date(subscription.next_payment_date),
          subscription.billing_period
        )

        if (upcomingPaymentDate.getTime() === new Date(subscription.next_payment_date).getTime()) {
          return subscription
        }

        return {
          ...subscription,
          next_payment_date: upcomingPaymentDate.toISOString(),
        }
      })

      return subscriptions.sort((a, b) =>
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
