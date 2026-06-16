import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/useAuth'
import type { Database } from '../../../types/database.types'
import {
  createSubscriptionWithCalendar,
  deleteSubscriptionWithCalendar,
  retrySubscriptionCalendarSync,
  updateSubscriptionWithCalendar,
} from '../services/subscriptionCalendarSync'

type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

export function useCreateSubscriptionWithCalendar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (subscription: Omit<SubscriptionInsert, 'user_id'>) => {
      if (!user) throw new Error('User not authenticated')
      return createSubscriptionWithCalendar(user, subscription)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })
}

export function useUpdateSubscriptionWithCalendar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...updates }: SubscriptionUpdate & { id: string }) => {
      if (!user) throw new Error('User not authenticated')
      return updateSubscriptionWithCalendar(user, id, updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })
}

export function useDeleteSubscriptionWithCalendar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated')
      await deleteSubscriptionWithCalendar(user, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })
}

export function useRetrySubscriptionCalendarSync() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated')
      return retrySubscriptionCalendarSync(user, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })
}
