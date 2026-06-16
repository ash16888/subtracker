import type { User } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { isSubscriptionBillable } from '../../../lib/utils/calculations'
import { googleCalendarService } from '../../../services/googleCalendar'
import type { Database } from '../../../types/database.types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']
type CalendarUser = Pick<User, 'id' | 'app_metadata'>
type CalendarSyncStatus = Subscription['calendar_sync_status']

const isGoogleUser = (user: CalendarUser): boolean => {
  return user.app_metadata?.provider === 'google'
}

const hasBillableStatus = (status?: Subscription['status']): boolean => {
  return status === undefined || status === 'active' || status === 'trial'
}

const hasCalendarSyncEnabled = (status?: CalendarSyncStatus): boolean => {
  return status !== 'disabled'
}

const hasCalendarChanges = (updates: SubscriptionUpdate): boolean => {
  return updates.name !== undefined ||
    updates.amount !== undefined ||
    updates.currency !== undefined ||
    updates.next_payment_date !== undefined ||
    updates.status !== undefined ||
    updates.calendar_sync_status !== undefined
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
  status: subscription.status,
  category: subscription.category,
  url: subscription.url,
  google_calendar_event_id: subscription.google_calendar_event_id,
  calendar_sync_status: subscription.calendar_sync_status,
  calendar_sync_error: subscription.calendar_sync_error,
  calendar_sync_attempted_at: subscription.calendar_sync_attempted_at,
})

const createSyncUpdate = (
  status: CalendarSyncStatus,
  error: string | null = null,
  eventId?: string | null
): SubscriptionUpdate => ({
  calendar_sync_status: status,
  calendar_sync_error: error,
  calendar_sync_attempted_at: new Date().toISOString(),
  ...(eventId !== undefined ? { google_calendar_event_id: eventId } : {}),
})

const createSyncErrorUpdate = (message: string): SubscriptionUpdate => (
  createSyncUpdate('error', message)
)

const rollbackSubscription = async (
  subscription: Subscription,
  calendarSyncError?: string
): Promise<void> => {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      ...getRollbackUpdates(subscription),
      ...(calendarSyncError ? createSyncErrorUpdate(calendarSyncError) : {}),
    })
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
    .update(createSyncUpdate('synced', null, calendarEventId))
    .eq('id', subscriptionId)
    .select()
    .single()

  if (error) throw error
  return data
}

const saveCalendarSyncState = async (
  subscriptionId: string,
  updates: SubscriptionUpdate
): Promise<Subscription> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
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
  let syncFields: SubscriptionUpdate = createSyncUpdate('not_connected', null, null)

  if (!hasBillableStatus(subscription.status) || !hasCalendarSyncEnabled(subscription.calendar_sync_status)) {
    syncFields = createSyncUpdate('disabled', null, null)
  } else if (isGoogleUser(user)) {
    syncFields = createSyncUpdate('pending', null, null)

    const calendarAccessible = await googleCalendarService.isCalendarAccessible()
    if (!calendarAccessible) {
      syncFields = createSyncErrorUpdate('Google Calendar is unavailable')
    } else {
      calendarEventId = await googleCalendarService.createPaymentReminder(
        subscription.name,
        subscription.amount,
        subscription.currency,
        subscription.next_payment_date
      )
      syncFields = calendarEventId
        ? createSyncUpdate('synced', null, calendarEventId)
        : createSyncErrorUpdate('Failed to create Google Calendar reminder')
    }
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      ...subscription,
      user_id: user.id,
      google_calendar_event_id: calendarEventId,
      calendar_sync_status: syncFields.calendar_sync_status,
      calendar_sync_error: syncFields.calendar_sync_error,
      calendar_sync_attempted_at: syncFields.calendar_sync_attempted_at,
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

  const shouldSyncReminder =
    isSubscriptionBillable(updatedSubscription) &&
    hasCalendarSyncEnabled(updatedSubscription.calendar_sync_status)
  const existingEventId = currentSubscription.google_calendar_event_id

  if (!shouldSyncReminder) {
    if (!existingEventId) {
      return saveCalendarSyncState(id, createSyncUpdate('disabled', null, null))
    }

    const calendarAccessible = await googleCalendarService.isCalendarAccessible()
    if (!calendarAccessible) {
      await rollbackSubscription(
        currentSubscription,
        'Google Calendar is unavailable; subscription update was rolled back'
      )
      throw new Error('Google Calendar is unavailable; subscription update was rolled back')
    }

    const deleted = await googleCalendarService.deletePaymentReminder(existingEventId)
    if (!deleted) {
      await rollbackSubscription(
        currentSubscription,
        'Failed to disable Google Calendar reminder; subscription update was rolled back'
      )
      throw new Error('Failed to disable Google Calendar reminder')
    }

    return saveCalendarSyncState(id, createSyncUpdate('disabled', null, null))
  }

  const calendarAccessible = await googleCalendarService.isCalendarAccessible()
  if (!calendarAccessible) {
    if (existingEventId) {
      await rollbackSubscription(
        currentSubscription,
        'Google Calendar is unavailable; subscription update was rolled back'
      )
      throw new Error('Google Calendar is unavailable; subscription update was rolled back')
    }
    return saveCalendarSyncState(id, createSyncErrorUpdate('Google Calendar is unavailable'))
  }

  const reminder = getReminderValues(currentSubscription, updates)

  if (existingEventId) {
    const updated = await googleCalendarService.updatePaymentReminder(
      existingEventId,
      reminder.name,
      reminder.amount,
      reminder.currency,
      reminder.nextPaymentDate
    )

    if (updated) {
      return saveCalendarSyncState(id, createSyncUpdate('synced', null, existingEventId))
    }
  }

  const newEventId = await googleCalendarService.createPaymentReminder(
    reminder.name,
    reminder.amount,
    reminder.currency,
    reminder.nextPaymentDate
  )

  if (!newEventId) {
    await rollbackSubscription(
      currentSubscription,
      'Failed to synchronize subscription with Google Calendar'
    )
    throw new Error('Failed to synchronize subscription with Google Calendar')
  }

  let subscriptionWithEvent: Subscription
  try {
    subscriptionWithEvent = await saveCalendarEventId(id, newEventId)
  } catch (error: unknown) {
    await googleCalendarService.deletePaymentReminder(newEventId)
    await rollbackSubscription(
      currentSubscription,
      'Failed to save Google Calendar reminder ID'
    )
    throw error
  }

  if (existingEventId) {
    const previousEventDeleted = await googleCalendarService.deletePaymentReminder(existingEventId)
    if (!previousEventDeleted) {
      await googleCalendarService.deletePaymentReminder(newEventId)
      await rollbackSubscription(
        currentSubscription,
        'Failed to remove the previous Google Calendar reminder'
      )
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
      await saveCalendarSyncState(
        id,
        createSyncErrorUpdate('Google Calendar is unavailable; subscription was not deleted')
      )
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
    .insert({
      ...subscription,
      ...createSyncErrorUpdate('Failed to delete Google Calendar reminder'),
    })

  if (restoreError) {
    throw new Error(`Failed to restore subscription after calendar error: ${restoreError.message}`)
  }

  throw new Error('Failed to delete Google Calendar reminder')
}

export async function retrySubscriptionCalendarSync(
  user: CalendarUser,
  id: string
): Promise<Subscription> {
  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  if (!isGoogleUser(user)) {
    return saveCalendarSyncState(id, createSyncUpdate('not_connected', null, null))
  }

  const existingEventId = subscription.google_calendar_event_id
  const shouldSyncReminder =
    isSubscriptionBillable(subscription) &&
    hasCalendarSyncEnabled(subscription.calendar_sync_status)

  if (!shouldSyncReminder) {
    if (!existingEventId) {
      return saveCalendarSyncState(id, createSyncUpdate('disabled', null, null))
    }

    const calendarAccessible = await googleCalendarService.isCalendarAccessible()
    if (!calendarAccessible) {
      const message = 'Google Calendar is unavailable'
      await saveCalendarSyncState(id, createSyncErrorUpdate(message))
      throw new Error(message)
    }

    const deleted = await googleCalendarService.deletePaymentReminder(existingEventId)
    if (!deleted) {
      const message = 'Failed to delete disabled subscription reminder'
      await saveCalendarSyncState(id, createSyncErrorUpdate(message))
      throw new Error(message)
    }

    return saveCalendarSyncState(id, createSyncUpdate('disabled', null, null))
  }

  const calendarAccessible = await googleCalendarService.isCalendarAccessible()
  if (!calendarAccessible) {
    const message = 'Google Calendar is unavailable'
    await saveCalendarSyncState(id, createSyncErrorUpdate(message))
    throw new Error(message)
  }

  const reminder = getReminderValues(subscription, {})

  if (existingEventId) {
    const updated = await googleCalendarService.updatePaymentReminder(
      existingEventId,
      reminder.name,
      reminder.amount,
      reminder.currency,
      reminder.nextPaymentDate
    )

    if (updated) {
      return saveCalendarSyncState(id, createSyncUpdate('synced', null, existingEventId))
    }
  }

  const newEventId = await googleCalendarService.createPaymentReminder(
    reminder.name,
    reminder.amount,
    reminder.currency,
    reminder.nextPaymentDate
  )

  if (!newEventId) {
    const message = 'Failed to synchronize subscription with Google Calendar'
    await saveCalendarSyncState(id, createSyncErrorUpdate(message))
    throw new Error(message)
  }

  const syncedSubscription = await saveCalendarEventId(id, newEventId)

  if (existingEventId) {
    const previousEventDeleted = await googleCalendarService.deletePaymentReminder(existingEventId)
    if (!previousEventDeleted) {
      const message = 'Failed to remove the previous Google Calendar reminder'
      await googleCalendarService.deletePaymentReminder(newEventId)
      await saveCalendarSyncState(id, {
        ...createSyncErrorUpdate(message),
        google_calendar_event_id: existingEventId,
      })
      throw new Error(message)
    }
  }

  return syncedSubscription
}
