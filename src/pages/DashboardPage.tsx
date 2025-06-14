import { useState, useMemo } from 'react'
import { useSubscriptions } from '../features/subscriptions/hooks/useSubscriptions'
import { SubscriptionForm } from '../features/subscriptions/components/SubscriptionForm'
import { SubscriptionList } from '../features/subscriptions/components/SubscriptionList'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Dashboard } from '../components/Dashboard'
import { UpcomingPaymentsPage } from './UpcomingPaymentsPage'
import { CalendarPermissionBanner } from '../components/CalendarPermissionBanner'

export function DashboardPage() {
  const [showForm, setShowForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'subscriptions' | 'payments'>('dashboard')
  const { data: subscriptions, isLoading, error } = useSubscriptions()

  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return []
    if (!selectedCategory) return subscriptions
    return subscriptions.filter(sub => sub.category === selectedCategory)
  }, [subscriptions, selectedCategory])

  const availableCategories = useMemo(() => {
    if (!subscriptions) return []
    const categories = subscriptions
      .map(sub => sub.category)
      .filter((category): category is string => category !== null)
    return Array.from(new Set(categories))
  }, [subscriptions])

  if (isLoading) return <LoadingSpinner />
  
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Ошибка загрузки подписок</p>
      </div>
    )
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SubTracker</h1>
          <p className="mt-1 text-sm text-gray-500">
            Управляйте своими подписками и контролируйте расходы
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Добавить подписку
          </button>
        </div>
      </div>

      <CalendarPermissionBanner />

      {/* Навигационные вкладки */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Дашборд
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'subscriptions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Мои подписки
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ближайшие платежи
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'subscriptions' && availableCategories.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-700">Фильтр по категориям:</span>
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                !selectedCategory
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все
            </button>
            {availableCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-8">
          <SubscriptionForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {/* Контент вкладок */}
      {activeTab === 'dashboard' && subscriptions && (
        <Dashboard subscriptions={subscriptions} />
      )}

      {activeTab === 'subscriptions' && (
        subscriptions && subscriptions.length > 0 ? (
          filteredSubscriptions.length > 0 ? (
            <SubscriptionList subscriptions={filteredSubscriptions} />
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Нет подписок в категории "{selectedCategory}"</h3>
              <p className="mt-1 text-sm text-gray-500">
                Попробуйте выбрать другую категорию или сбросьте фильтр
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setSelectedCategory('')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Показать все
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет подписок</h3>
            <p className="mt-1 text-sm text-gray-500">
              Начните с добавления вашей первой подписки
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Добавить подписку
              </button>
            </div>
          </div>
        )
      )}

      {activeTab === 'payments' && (
        <UpcomingPaymentsPage />
      )}
    </div>
  )
}