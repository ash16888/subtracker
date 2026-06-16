import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { RefreshCw } from 'lucide-react'
import type { Database } from '../../../types/database.types'
import { formatCurrency, isSubscriptionBillable } from '../../../lib/utils/calculations'
import { useDeleteSubscriptionWithCalendar, useRetrySubscriptionCalendarSync } from '../../calendar/hooks/useCalendarSubscriptions'
import { useState } from 'react'
import { SubscriptionForm } from './SubscriptionForm'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionStatus = Subscription['status']
type CalendarSyncStatus = Subscription['calendar_sync_status']

interface SubscriptionListProps {
  subscriptions: Subscription[]
}

const SUBSCRIPTION_STATUS_META: Record<SubscriptionStatus, { label: string; className: string }> = {
  active: {
    label: 'Активна',
    className: 'bg-green-100 text-green-800',
  },
  trial: {
    label: 'Пробный период',
    className: 'bg-blue-100 text-blue-800',
  },
  paused: {
    label: 'Приостановлена',
    className: 'bg-yellow-100 text-yellow-800',
  },
  canceled: {
    label: 'Отменена',
    className: 'bg-gray-100 text-gray-700',
  },
  archived: {
    label: 'Архив',
    className: 'bg-slate-100 text-slate-700',
  },
}

const CALENDAR_SYNC_STATUS_META: Record<CalendarSyncStatus, { label: string; className: string }> = {
  synced: {
    label: 'Календарь: синхронизирован',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  pending: {
    label: 'Календарь: синхронизация',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  error: {
    label: 'Календарь: ошибка',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  not_connected: {
    label: 'Календарь: не настроен',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  disabled: {
    label: 'Календарь: выключен',
    className: 'bg-slate-50 text-slate-600 border-slate-200',
  },
}

const getSubscriptionStatusMeta = (status: Subscription['status'] | undefined) => {
  return SUBSCRIPTION_STATUS_META[status ?? 'active']
}

const getCalendarSyncStatusMeta = (status: Subscription['calendar_sync_status'] | undefined) => {
  return CALENDAR_SYNC_STATUS_META[status ?? 'not_connected']
}

const getEffectiveCalendarSyncStatus = (subscription: Subscription): CalendarSyncStatus => {
  if (subscription.google_calendar_event_id && subscription.calendar_sync_status === 'not_connected') {
    return 'synced'
  }

  return subscription.calendar_sync_status ?? 'not_connected'
}

const canRunCalendarSync = (subscription: Subscription) => {
  const effectiveStatus = getEffectiveCalendarSyncStatus(subscription)

  return isSubscriptionBillable(subscription) &&
    (effectiveStatus === 'not_connected' || effectiveStatus === 'error')
}

export function SubscriptionList({ subscriptions }: SubscriptionListProps) {
  const deleteSubscription = useDeleteSubscriptionWithCalendar()
  const retryCalendarSync = useRetrySubscriptionCalendarSync()
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)

  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту подписку?')) {
      await deleteSubscription.mutateAsync(id)
    }
  }

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription)
  }

  const handleCloseEdit = () => {
    setEditingSubscription(null)
  }

  const handleRetrySync = async (id: string) => {
    try {
      await retryCalendarSync.mutateAsync(id)
    } catch (error: unknown) {
      console.error('Error retrying calendar synchronization:', error)
    }
  }

  return (
    <div>
      {editingSubscription && (
        <div className="mb-8">
          <SubscriptionForm 
            subscription={editingSubscription} 
            onClose={handleCloseEdit} 
          />
        </div>
      )}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {subscriptions.map((subscription) => {
          const subscriptionStatus = getSubscriptionStatusMeta(subscription.status)
          const effectiveCalendarSyncStatus = getEffectiveCalendarSyncStatus(subscription)
          const calendarSyncStatus = getCalendarSyncStatusMeta(effectiveCalendarSyncStatus)
          const showCalendarAction = canRunCalendarSync(subscription)
          const calendarActionLabel = effectiveCalendarSyncStatus === 'error'
            ? 'Повторить'
            : 'Синхронизировать'

          return (
            <li key={subscription.id}>
              <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-600 truncate">
                      {subscription.name}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {subscription.billing_period === 'monthly' ? 'Ежемесячно' : 'Ежегодно'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${subscriptionStatus.className}`}>
                      {subscriptionStatus.label}
                    </span>
                    <span className={`px-2 inline-flex text-xs leading-5 font-medium rounded-full border ${calendarSyncStatus.className}`}>
                      {calendarSyncStatus.label}
                    </span>
                    {showCalendarAction && (
                      <button
                        type="button"
                        onClick={() => handleRetrySync(subscription.id)}
                        disabled={retryCalendarSync.isPending}
                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 text-xs font-medium leading-5 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                        title={`${calendarActionLabel} с Google Calendar`}
                      >
                        <RefreshCw className="h-3 w-3" />
                        {calendarActionLabel}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {formatCurrency(Number(subscription.amount), subscription.currency)}
                      </p>
                      {subscription.category && (
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <span className="truncate">{subscription.category}</span>
                        </p>
                      )}
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        Следующий платеж:{' '}
                        <time dateTime={subscription.next_payment_date}>
                          {format(new Date(subscription.next_payment_date), 'd MMMM yyyy', {
                            locale: ru,
                          })}
                        </time>
                      </p>
                    </div>
                  </div>
                  {effectiveCalendarSyncStatus === 'error' && subscription.calendar_sync_error && (
                    <p className="mt-2 max-w-3xl text-xs text-red-600">
                      Ошибка календаря: {subscription.calendar_sync_error}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0 flex space-x-2">
                  {subscription.url && (
                    <a
                      href={subscription.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-500"
                      title="Управление подпиской"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={() => handleEdit(subscription)}
                    className="text-blue-400 hover:text-blue-500"
                    title="Редактировать подписку"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(subscription.id)}
                    className="text-red-400 hover:text-red-500"
                    title="Удалить подписку"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              </div>
            </li>
          )
        })}
      </ul>
      </div>
    </div>
  )
}
