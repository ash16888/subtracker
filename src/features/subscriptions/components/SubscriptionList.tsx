import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Database } from '../../../types/database.types'
import { formatCurrency } from '../../../lib/utils/calculations'
import { useDeleteSubscriptionWithCalendar } from '../../calendar/hooks/useCalendarSubscriptions'
import { useState } from 'react'
import { SubscriptionForm } from './SubscriptionForm'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

interface SubscriptionListProps {
  subscriptions: Subscription[]
}

export function SubscriptionList({ subscriptions }: SubscriptionListProps) {
  const deleteSubscription = useDeleteSubscriptionWithCalendar()
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
        {subscriptions.map((subscription) => (
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
        ))}
      </ul>
      </div>
    </div>
  )
}