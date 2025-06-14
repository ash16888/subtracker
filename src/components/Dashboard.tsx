import { useMemo } from 'react'
import type { Database } from '../types/database.types'
import { formatCurrency } from '../lib/utils/calculations'
import { addMonths, startOfMonth, endOfMonth } from 'date-fns'
import { StatsCards } from './StatsCards'
import { PieChart } from './PieChart'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

interface DashboardProps {
  subscriptions: Subscription[]
}

interface CategoryStat {
  category: string
  amount: number
  count: number
  percentage: number
  color: string
}

const CATEGORY_COLORS: Record<string, string> = {
  'Мультисервис': '#ef4444',
  'Развлечения': '#f59e0b', 
  'Работа': '#3b82f6',
  'ИИ': '#10b981',
  'Игры': '#ec4899',
  'Связь': '#8b5cf6',
  'Другое': '#6b7280'
}

export function Dashboard({ subscriptions }: DashboardProps) {
  const stats = useMemo(() => {
    const totalMonthly = subscriptions.reduce((sum, sub) => sum + Number(sub.amount), 0)
    const totalYearly = totalMonthly * 12
    
    // Статистика по категориям
    const categoryStats: Record<string, { amount: number; count: number }> = {}
    
    subscriptions.forEach(sub => {
      const category = sub.category || 'Другое'
      if (!categoryStats[category]) {
        categoryStats[category] = { amount: 0, count: 0 }
      }
      categoryStats[category].amount += Number(sub.amount)
      categoryStats[category].count += 1
    })

    const categoryList: CategoryStat[] = Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        amount: stats.amount,
        count: stats.count,
        percentage: (stats.amount / totalMonthly) * 100,
        color: CATEGORY_COLORS[category] || CATEGORY_COLORS['Другое']
      }))
      .sort((a, b) => b.amount - a.amount)

    // Предстоящие платежи
    const currentMonth = new Date()
    const nextMonth = addMonths(currentMonth, 1)
    const currentMonthStart = startOfMonth(currentMonth)
    const currentMonthEnd = endOfMonth(currentMonth)
    const nextMonthStart = startOfMonth(nextMonth)
    const nextMonthEnd = endOfMonth(nextMonth)

    const currentMonthPayments = subscriptions.filter(sub => {
      const paymentDate = new Date(sub.next_payment_date)
      return paymentDate >= currentMonthStart && paymentDate <= currentMonthEnd
    })

    const nextMonthPayments = subscriptions.filter(sub => {
      const paymentDate = new Date(sub.next_payment_date)
      return paymentDate >= nextMonthStart && paymentDate <= nextMonthEnd
    })

    return {
      totalMonthly,
      totalYearly,
      categoryList,
      subscriptionCount: subscriptions.length,
      averagePerSubscription: totalMonthly / (subscriptions.length || 1),
      currentMonthTotal: currentMonthPayments.reduce((sum, sub) => sum + Number(sub.amount), 0),
      nextMonthTotal: nextMonthPayments.reduce((sum, sub) => sum + Number(sub.amount), 0)
    }
  }, [subscriptions])

  const maxAmount = Math.max(...stats.categoryList.map(cat => cat.amount))

  return (
    <div className="space-y-6">
      {/* Красивые карточки статистики */}
      <StatsCards subscriptions={subscriptions} />
      
      {/* Основная статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">В месяц</dt>
                <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.totalMonthly, '₽')}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">В год</dt>
                <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.totalYearly, '₽')}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Подписок</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.subscriptionCount}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Средняя цена</dt>
                <dd className="text-lg font-medium text-gray-900">{formatCurrency(Math.round(stats.averagePerSubscription), '₽')}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Круговая диаграмма */}
        <PieChart subscriptions={subscriptions} />
        
        {/* Распределение по категориям */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Расходы по категориям</h3>
          <div className="space-y-4">
            {stats.categoryList.map((category) => (
              <div key={category.category} className="flex items-center">
                <div className="flex items-center min-w-0 flex-1">
                  <div 
                    className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {category.category}
                    </p>
                    <p className="text-sm text-gray-500">
                      {category.count} подписок
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0 text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(category.amount, '₽')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {category.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Визуальная диаграмма */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Визуальное распределение</h3>
          <div className="space-y-3">
            {stats.categoryList.map((category) => (
              <div key={category.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{category.category}</span>
                  <span className="text-gray-500">{formatCurrency(category.amount, '₽')}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: category.color,
                      width: `${(category.amount / maxAmount) * 100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}