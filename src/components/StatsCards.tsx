import { useMemo } from 'react'
import type { Database } from '../types/database.types'
import { formatCurrency } from '../lib/utils/calculations'
import { addMonths, format } from 'date-fns'
import { ru } from 'date-fns/locale'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

interface StatsCardsProps {
  subscriptions: Subscription[]
}

export function StatsCards({ subscriptions }: StatsCardsProps) {
  const stats = useMemo(() => {
    const totalMonthly = subscriptions.reduce((sum, sub) => sum + Number(sub.amount), 0)
    const totalYearly = totalMonthly * 12
    
    // Самая дорогая подписка
    const mostExpensive = subscriptions.reduce((max, sub) => 
      Number(sub.amount) > Number(max.amount) ? sub : max, 
      subscriptions[0] || { amount: 0, name: '', currency: '₽' }
    )
    
    // Самая дешёвая подписка
    const cheapest = subscriptions.reduce((min, sub) => 
      Number(sub.amount) < Number(min.amount) ? sub : min,
      subscriptions[0] || { amount: 0, name: '', currency: '₽' }
    )
    
    // Прогноз на следующий месяц
    const nextMonth = addMonths(new Date(), 1)
    const nextMonthPayments = subscriptions.filter(sub => {
      const paymentDate = new Date(sub.next_payment_date)
      return paymentDate.getMonth() === nextMonth.getMonth() && 
             paymentDate.getFullYear() === nextMonth.getFullYear()
    })
    const nextMonthTotal = nextMonthPayments.reduce((sum, sub) => sum + Number(sub.amount), 0)
    
    // Самая популярная категория
    const categoryCounts: Record<string, number> = {}
    subscriptions.forEach(sub => {
      const category = sub.category || 'Другое'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })
    const popularCategory = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)[0]
    
    return {
      totalMonthly,
      totalYearly,
      mostExpensive,
      cheapest,
      nextMonthTotal,
      popularCategory: popularCategory ? popularCategory[0] : 'Нет данных',
      categoryCount: popularCategory ? popularCategory[1] : 0,
      subscriptionCount: subscriptions.length
    }
  }, [subscriptions])

  if (subscriptions.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Самая дорогая подписка */}
      <div className="group relative overflow-hidden rounded-2xl shadow-soft hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-red-100 text-xs uppercase tracking-wider font-semibold">Самая дорогая</p>
              <p className="text-3xl font-bold tracking-tight">{formatCurrency(Number(stats.mostExpensive.amount), stats.mostExpensive.currency)}</p>
              <p className="text-red-100 text-sm font-medium truncate max-w-[180px]">{stats.mostExpensive.name}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Самая дешёвая подписка */}
      <div className="group relative overflow-hidden rounded-2xl shadow-soft hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-emerald-100 text-xs uppercase tracking-wider font-semibold">Самая дешёвая</p>
              <p className="text-3xl font-bold tracking-tight">{formatCurrency(Number(stats.cheapest.amount), stats.cheapest.currency)}</p>
              <p className="text-emerald-100 text-sm font-medium truncate max-w-[180px]">{stats.cheapest.name}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Прогноз на следующий месяц */}
      <div className="group relative overflow-hidden rounded-2xl shadow-soft hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-blue-100 text-xs uppercase tracking-wider font-semibold">Следующий месяц</p>
              <p className="text-3xl font-bold tracking-tight">{formatCurrency(stats.nextMonthTotal, '₽')}</p>
              <p className="text-blue-100 text-sm font-medium">
                {format(addMonths(new Date(), 1), 'LLLL yyyy', { locale: ru })}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Популярная категория */}
      <div className="group relative overflow-hidden rounded-2xl shadow-soft hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-violet-100 text-xs uppercase tracking-wider font-semibold">Популярная категория</p>
              <p className="text-3xl font-bold tracking-tight">{stats.popularCategory}</p>
              <p className="text-violet-100 text-sm font-medium">{stats.categoryCount} подписок</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Годовые расходы */}
      <div className="group relative overflow-hidden rounded-2xl shadow-soft hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-amber-100 text-xs uppercase tracking-wider font-semibold">Годовые расходы</p>
              <p className="text-3xl font-bold tracking-tight">{formatCurrency(stats.totalYearly, '₽')}</p>
              <p className="text-amber-100 text-sm font-medium">За 12 месяцев</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Средний чек */}
      <div className="group relative overflow-hidden rounded-2xl shadow-soft hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="relative p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-cyan-100 text-xs uppercase tracking-wider font-semibold">Средний чек</p>
              <p className="text-3xl font-bold tracking-tight">{formatCurrency(Math.round(stats.totalMonthly / stats.subscriptionCount), '₽')}</p>
              <p className="text-cyan-100 text-sm font-medium">За подписку</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}