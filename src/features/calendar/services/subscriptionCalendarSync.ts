import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { googleCalendarService } from '../../../services/googleCalendar'
import type { Database } from '../../../types/database.types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']
type CalendarUser = Pick<User, 'id' | 'app_metadata'>

const isGoogleUser = (user: CalendarUser): boolean => {
  return user.app_metadata?.provider === 'google'
}

const hasCalendarChanges = (updates: SubscriptionUpdate): boolean => {
  return updates.name !== undefined ||
    updates.amount !== undefined ||
    updates.currency !== undefined ||
    updates.next_payment_date !== undefined
}

const getReminderValues = (
  currentSubscription: Subscription,
  updates: SubscriptionUpdate
) => ({
  name: updates.name ?? currentSubscription.name,
  amount: updates.amount ?? currentSubscription.amount,
  currency: updates.currency ?? currentSubscription.currency,
  nextPaymentDate: updates.next_payment_date ?? currentSubscription.next_payment_date,
})

const getRollbackUpdates = (subscription: Subscription): SubscriptionUpdate => ({
  name: subscription.name,
  amount: subscription.amount,
  currency: subscription.currency,
  billing_period: subscription.billing_period,
  next_payment_date: subscription.next_payment_date,
  category: subscription.category,
  url: subscription.url,
  google_calendar_event_id: subscription.google_calendar_event_id,
})

const rollbackSubscription = async (subscription: Subscription): Promise<void> => {
  const { error } = await supabase
    .from('subscriptions')
    .update(getRollbackUpdates(subscription))
    .eq('id', subscription.id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to roll back subscription: ${error.message}`)
  }
}

const saveCalendarEventId = async (
  subscriptionId: string,
  calendarEventId: string
): Promise<Subscription> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ google_calendar_event_id: calendarEventId })
    .eq('id', subscriptionId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createSubscriptionWithCalendar(
  user: CalendarUser,
  subscription: Omit<SubscriptionInsert, 'user_id'>
): Promise<Subscription> {
  let calendarEventId: string | null = null

  if (isGoogleUser(user) && await googleCalendarService.isCalendarAccessible()) {
    calendarEventId = await googleCalendarService.createPaymentReminder(
      subscription.name,
      subscription.amount,
      subscription.currency,
      subscription.next_payment_date
    )
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      ...subscription,
      user_id: user.id,
      google_calendar_event_id: calendarEventId,
    })
    .select()
    .single()

  if (error) {
    if (calendarEventId) {
      await googleCalendarService.deletePaymentReminder(calendarEventId)
    }
    throw error
  }

  return data
}

export async function updateSubscriptionWithCalendar(
  user: CalendarUser,
  id: string,
  updates: SubscriptionUpdate
): Promise<Subscription> {
  const { data: currentSubscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const { data: updatedSubscription, error: updateError } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) throw updateError

  if (!isGoogleUser(user) || !hasCalendarChanges(updates)) {
    return updatedSubscription
  }

  const calendarAccessible = await googleCalendarService.isCalendarAccessible()
  if (!calendarAccessible) {
    if (currentSubscription.google_calendar_event_id) {
      await rollbackSubscription(currentSubscription)
      throw new Error('Google Calendar is unavailable; subscription update was rolled back')
    }
    return updatedSubscription
  }

  const reminder = getReminderValues(currentSubscription, updates)
  const existingEventId = currentSubscription.google_calendar_event_id

  if (existingEventId) {
    const updated = await googleCalendarService.updatePaymentReminder(
      existingEventId,
      reminder.name,
      reminder.amount,
      reminder.currency,
      reminder.nextPaymentDate
    )

    if (updated) {
      return updatedSubscription
    }
  }

  const newEventId = await googleCalendarService.createPaymentReminder(
    reminder.name,
    reminder.amount,
    reminder.currency,
    reminder.nextPaymentDate
  )

  if (!newEventId) {
    await rollbackSubscription(currentSubscription)
    throw new Error('Failed to synchronize subscription with Google Calendar')
  }

  let subscriptionWithEvent: Subscription
  try {
    subscriptionWithEvent = await saveCalendarEventId(id, newEventId)
  } catch (error: unknown) {
    await googleCalendarService.deletePaymentReminder(newEventId)
    await rollbackSubscription(currentSubscription)
    throw error
  }

  if (existingEventId) {
    const previousEventDeleted = await googleCalendarService.deletePaymentReminder(existingEventId)
    if (!previousEventDeleted) {
      await googleCalendarService.deletePaymentReminder(newEventId)
      await rollbackSubscription(currentSubscription)
      throw new Error('Failed to remove the previous Google Calendar reminder')
    }
  }

  return subscriptionWithEvent
}

export async function deleteSubscriptionWithCalendar(
  user: CalendarUser,
  id: string
): Promise<void> {
  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const calendarEventId = subscription.google_calendar_event_id
  if (isGoogleUser(user) && calendarEventId) {
    const calendarAccessible = await googleCalendarService.isCalendarAccessible()
    if (!calendarAccessible) {
      throw new Error('Google Calendar is unavailable; subscription was not deleted')
    }
  }

  const { error: deleteError } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)

  if (deleteError) throw deleteError

  if (!isGoogleUser(user) || !calendarEventId) {
    return
  }

  const calendarDeleted = await googleCalendarService.deletePaymentReminder(calendarEventId)
  if (calendarDeleted) {
    return
  }

  const { error: restoreError } = await supabase
    .from('subscriptions')
    .insert(subscription)

  if (restoreError) {
    throw new Error(`Failed to restore subscription after calendar error: ${restoreError.message}`)
  }

  throw new Error('Failed to delete Google Calendar reminder')
}
