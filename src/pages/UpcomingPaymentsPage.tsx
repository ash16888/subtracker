import { useMemo } from 'react'
import { useSubscriptions } from '../features/subscriptions/hooks/useSubscriptions'
import { formatCurrency } from '../lib/utils/calculations'
import { format, addDays, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Database } from '../types/database.types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

const CATEGORY_COLORS: Record<string, string> = {
  'Мультисервис': '#ef4444',
  'Развлечения': '#f59e0b', 
  'Работа': '#3b82f6',
  'ИИ': '#10b981',
  'Игры': '#ec4899',
  'Связь': '#8b5cf6',
  'Другое': '#6b7280'
}

export function UpcomingPaymentsPage() {
  const { data: subscriptions = [] } = useSubscriptions()

  const paymentGroups = useMemo(() => {
    const now = new Date()
    const today = startOfDay(now)
    const thirtyDaysFromNow = addDays(today, 30)
    const ninetyDaysFromNow = addDays(today, 90)

    const groupedPayments = {
      within30Days: [] as Subscription[],
      within90Days: [] as Subscription[],
      later: [] as Subscription[]
    }

    subscriptions.forEach(sub => {
      const paymentDate = startOfDay(new Date(sub.next_payment_date))
      
      if (paymentDate <= thirtyDaysFromNow) {
        groupedPayments.within30Days.push(sub)
      } else if (paymentDate <= ninetyDaysFromNow) {
        groupedPayments.within90Days.push(sub)
      } else {
        groupedPayments.later.push(sub)
      }
    })

    // Сортируем каждую группу по дате
    Object.values(groupedPayments).forEach(group => {
      group.sort((a, b) => new Date(a.next_payment_date).getTime() - new Date(b.next_payment_date).getTime())
    })

    return groupedPayments
  }, [subscriptions])

  const PaymentGroup = ({ title, payments, bgColor, textColor }: {
    title: string
    payments: Subscription[]
    bgColor: string
    textColor: string
  }) => {
    if (payments.length === 0) return null

    return (
      <div className="bg-white rounded-lg shadow">
        <div className={`${bgColor} ${textColor} px-6 py-4 rounded-t-lg`}>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm opacity-90">{payments.length} подписок</p>
        </div>
        <div className="p-6">
          <ul className="space-y-4">
            {payments.map((subscription) => (
              <li key={subscription.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[subscription.category || 'Другое'] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{subscription.name}</p>
                    <p className="text-sm text-gray-500">{subscription.category || 'Другое'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(Number(subscription.amount), subscription.currency)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {format(new Date(subscription.next_payment_date), 'd MMM yyyy', { locale: ru })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  const totalUpcoming = useMemo(() => {
    const allUpcoming = [
      ...paymentGroups.within30Days,
      ...paymentGroups.within90Days
    ]
    return allUpcoming.reduce((sum, sub) => sum + Number(sub.amount), 0)
  }, [paymentGroups])

  return (
    <div className="space-y-6">
      {/* Заголовок страницы */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ближайшие платежи</h1>
            <p className="text-gray-600 mt-1">Управляйте предстоящими списаниями по подпискам</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Всего в ближайшее время</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalUpcoming, '₽')}</p>
          </div>
        </div>
      </div>

      {/* Группы платежей */}
      <div className="space-y-6">
        <PaymentGroup 
          title="Осталось менее 30 дней" 
          payments={paymentGroups.within30Days}
          bgColor="bg-red-500"
          textColor="text-white"
        />
        
        <PaymentGroup 
          title="Осталось менее 90 дней" 
          payments={paymentGroups.within90Days}
          bgColor="bg-yellow-500"
          textColor="text-white"
        />
        
        <PaymentGroup 
          title="Позже" 
          payments={paymentGroups.later}
          bgColor="bg-gray-500"
          textColor="text-white"
        />
      </div>

      {subscriptions.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет подписок</h3>
          <p className="text-gray-500">Добавьте свои первые подписки, чтобы отслеживать платежи</p>
        </div>
      )}
    </div>
  )
}