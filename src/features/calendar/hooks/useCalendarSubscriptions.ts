import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { googleCalendarService } from '../../../services/googleCalendar'
import type { Database } from '../../../types/database.types'

type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

export function useCreateSubscriptionWithCalendar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (subscription: Omit<SubscriptionInsert, 'user_id'>) => {
      console.log('Calendar-enabled createSubscription hook called');
      if (!user) throw new Error('User not authenticated')

      // Проверяем, авторизован ли пользователь через Google и доступен ли календарь
      const isGoogleUser = user.app_metadata?.provider === 'google'
      let calendarEventId: string | null = null
      
      if (isGoogleUser) {
        const isCalendarAccessible = await googleCalendarService.isCalendarAccessible()
        if (isCalendarAccessible) {
          console.log('Creating calendar event for Google user');
          calendarEventId = await googleCalendarService.createPaymentReminder(
            subscription.name,
            subscription.amount,
            subscription.currency,
            subscription.next_payment_date
          )
          console.log('Calendar event created with ID:', calendarEventId);
        } else {
          console.log('Calendar not accessible for Google user');
        }
      } else {
        console.log('User not authenticated via Google, skipping calendar integration');
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .insert({ 
          ...subscription, 
          user_id: user.id,
          google_calendar_event_id: calendarEventId
        })
        .select()
        .single()

      if (error) {
        // Если не удалось создать подписку, удаляем созданное событие календаря
        if (calendarEventId) {
          await googleCalendarService.deletePaymentReminder(calendarEventId)
        }
        throw error
      }
      
      console.log('Subscription created successfully with calendar integration:', data);
      return data
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

      // Получаем текущую подписку для получения event_id
      const { data: currentSubscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const isGoogleUser = user.app_metadata?.provider === 'google'
      let calendarEventId = currentSubscription.google_calendar_event_id

      if (isGoogleUser) {
        const isCalendarAccessible = await googleCalendarService.isCalendarAccessible()
        
        if (isCalendarAccessible) {
          // Если есть изменения в данных, которые влияют на календарь
          const needsCalendarUpdate = updates.name || updates.amount || updates.currency || updates.next_payment_date

          if (needsCalendarUpdate) {
            if (calendarEventId) {
              // Обновляем существующее событие
              console.log('Updating existing calendar event:', calendarEventId);
              const success = await googleCalendarService.updatePaymentReminder(
                calendarEventId,
                updates.name || currentSubscription.name,
                updates.amount || currentSubscription.amount,
                updates.currency || currentSubscription.currency,
                updates.next_payment_date || currentSubscription.next_payment_date
              )
              if (!success) {
                console.log('Failed to update calendar event, creating new one');
                // Если не удалось обновить, создаем новое
                calendarEventId = await googleCalendarService.createPaymentReminder(
                  updates.name || currentSubscription.name,
                  updates.amount || currentSubscription.amount,
                  updates.currency || currentSubscription.currency,
                  updates.next_payment_date || currentSubscription.next_payment_date
                )
              }
            } else {
              // Создаем новое событие, если его не было
              console.log('Creating new calendar event for existing subscription');
              calendarEventId = await googleCalendarService.createPaymentReminder(
                updates.name || currentSubscription.name,
                updates.amount || currentSubscription.amount,
                updates.currency || currentSubscription.currency,
                updates.next_payment_date || currentSubscription.next_payment_date
              )
            }
          }
        }
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .update({ ...updates, google_calendar_event_id: calendarEventId })
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

export function useDeleteSubscriptionWithCalendar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated')

      // Получаем подписку для получения event_id
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('google_calendar_event_id')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Удаляем событие из календаря, если оно существует
      const isGoogleUser = user.app_metadata?.provider === 'google'
      if (isGoogleUser && subscription.google_calendar_event_id) {
        const isCalendarAccessible = await googleCalendarService.isCalendarAccessible()
        if (isCalendarAccessible) {
          console.log('Deleting calendar event:', subscription.google_calendar_event_id);
          await googleCalendarService.deletePaymentReminder(subscription.google_calendar_event_id)
        }
      }

      // Удаляем подписку
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