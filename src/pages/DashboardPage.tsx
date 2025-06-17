import { useState, useMemo } from 'react'
import { useSubscriptions } from '../features/subscriptions/hooks/useSubscriptions'
import { SubscriptionForm } from '../features/subscriptions/components/SubscriptionForm'
import { SubscriptionList } from '../features/subscriptions/components/SubscriptionList'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Dashboard } from '../components/Dashboard'
import { UpcomingPaymentsPage } from './UpcomingPaymentsPage'
import { CalendarPermissionBanner } from '../components/CalendarPermissionBanner'
import { getCategoryIcon } from '../utils/categoryIcons'

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
          <p className="text-lg text-gray-600 font-medium">
            Управляйте своими подписками и контролируйте расходы
          </p>
        </div>
        <div className="mt-6 sm:mt-0">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl shadow-soft text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Добавить подписку
          </button>
        </div>
      </div>

      <CalendarPermissionBanner />

      {/* Навигационные вкладки */}
      <div className="mb-8">
        <div className="card">
          <nav className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Дашборд</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'subscriptions'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Мои подписки</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'payments'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Ближайшие платежи</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'subscriptions' && availableCategories.length > 0 && (
        <div className="mb-8">
          <div className="card">
            <div className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-semibold text-gray-700">Фильтр по категориям:</span>
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    !selectedCategory
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  Все
                </button>
                {availableCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    {getCategoryIcon(category, "w-4 h-4")}
                    <span>{category}</span>
                  </button>
                ))}
              </div>
            </div>
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
            <div className="card animate-fade-in">
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <svg
                    className="h-10 w-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет подписок в категории "{selectedCategory}"</h3>
                <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                  Попробуйте выбрать другую категорию или сбросьте фильтр, чтобы увидеть все подписки
                </p>
                <button
                  onClick={() => setSelectedCategory('')}
                  className="inline-flex items-center px-6 py-3 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Показать все
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="card animate-fade-in">
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                <svg
                  className="h-12 w-12 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Добро пожаловать в SubTracker!</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Начните управлять своими подписками и контролировать расходы. Добавьте первую подписку, чтобы увидеть аналитику.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-8 py-4 border border-transparent text-base font-semibold rounded-xl shadow-soft text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Добавить первую подписку
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