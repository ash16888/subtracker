import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../../../lib/supabase'
import { googleCalendarService } from '../../../services/googleCalendar'
import {
  deleteSubscriptionWithCalendar,
  updateSubscriptionWithCalendar,
} from './subscriptionCalendarSync'

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('../../../services/googleCalendar', () => ({
  googleCalendarService: {
    isCalendarAccessible: vi.fn(),
    createPaymentReminder: vi.fn(),
    updatePaymentReminder: vi.fn(),
    deletePaymentReminder: vi.fn(),
  },
}))

const googleUser = {
  id: 'user-1',
  app_metadata: { provider: 'google' },
}

const subscription = {
  id: 'subscription-1',
  name: 'Netflix',
  amount: 999,
  currency: 'RUB',
  billing_period: 'monthly' as const,
  next_payment_date: '2026-07-01T00:00:00.000Z',
  category: 'Развлечения',
  url: null,
  user_id: 'user-1',
  google_calendar_event_id: 'event-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const createSelectChain = (result: unknown) => {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  return chain
}

const createUpdateChain = (result: unknown) => {
  const chain = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
  }
  chain.update.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  return chain
}

describe('subscription calendar synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rolls the database update back when calendar synchronization fails', async () => {
    const fetchChain = createSelectChain({ data: subscription, error: null })
    const updatedSubscription = { ...subscription, name: 'Netflix Premium' }
    const updateChain = createUpdateChain({ data: updatedSubscription, error: null })
    const rollbackChain = createUpdateChain({ data: subscription, error: null })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(fetchChain as never)
      .mockReturnValueOnce(updateChain as never)
      .mockReturnValueOnce(rollbackChain as never)
    vi.mocked(googleCalendarService.isCalendarAccessible).mockResolvedValue(true)
    vi.mocked(googleCalendarService.updatePaymentReminder).mockResolvedValue(false)
    vi.mocked(googleCalendarService.createPaymentReminder).mockResolvedValue(null)

    await expect(updateSubscriptionWithCalendar(googleUser, subscription.id, {
      name: 'Netflix Premium',
    })).rejects.toThrow('Failed to synchronize subscription with Google Calendar')

    expect(updateChain.update).toHaveBeenCalledWith({ name: 'Netflix Premium' })
    expect(rollbackChain.update).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Netflix',
      google_calendar_event_id: 'event-1',
    }))
    expect(updateChain.update.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(googleCalendarService.updatePaymentReminder).mock.invocationCallOrder[0]
    )
  })

  it('restores the database row when calendar deletion fails', async () => {
    const fetchChain = createSelectChain({ data: subscription, error: null })
    const deleteFilter = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    const deleteChain = {
      delete: vi.fn().mockReturnValue(deleteFilter),
    }
    const restoreChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    }

    vi.mocked(supabase.from)
      .mockReturnValueOnce(fetchChain as never)
      .mockReturnValueOnce(deleteChain as never)
      .mockReturnValueOnce(restoreChain as never)
    vi.mocked(googleCalendarService.isCalendarAccessible).mockResolvedValue(true)
    vi.mocked(googleCalendarService.deletePaymentReminder).mockResolvedValue(false)

    await expect(
      deleteSubscriptionWithCalendar(googleUser, subscription.id)
    ).rejects.toThrow('Failed to delete Google Calendar reminder')

    expect(restoreChain.insert).toHaveBeenCalledWith(subscription)
    expect(deleteChain.delete.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(googleCalendarService.deletePaymentReminder).mock.invocationCallOrder[0]
    )
  })

  it('removes the replacement event and rolls back when the old event cannot be deleted', async () => {
    const fetchChain = createSelectChain({ data: subscription, error: null })
    const updatedSubscription = { ...subscription, name: 'Netflix Premium' }
    const updateChain = createUpdateChain({ data: updatedSubscription, error: null })
    const saveEventChain = createUpdateChain({
      data: { ...updatedSubscription, google_calendar_event_id: 'event-2' },
      error: null,
    })
    const rollbackChain = createUpdateChain({ data: subscription, error: null })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(fetchChain as never)
      .mockReturnValueOnce(updateChain as never)
      .mockReturnValueOnce(saveEventChain as never)
      .mockReturnValueOnce(rollbackChain as never)
    vi.mocked(googleCalendarService.isCalendarAccessible).mockResolvedValue(true)
    vi.mocked(googleCalendarService.updatePaymentReminder).mockResolvedValue(false)
    vi.mocked(googleCalendarService.createPaymentReminder).mockResolvedValue('event-2')
    vi.mocked(googleCalendarService.deletePaymentReminder)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    await expect(updateSubscriptionWithCalendar(googleUser, subscription.id, {
      name: 'Netflix Premium',
    })).rejects.toThrow('Failed to remove the previous Google Calendar reminder')

    expect(googleCalendarService.deletePaymentReminder).toHaveBeenNthCalledWith(1, 'event-1')
    expect(googleCalendarService.deletePaymentReminder).toHaveBeenNthCalledWith(2, 'event-2')
    expect(rollbackChain.update).toHaveBeenCalled()
  })
})
