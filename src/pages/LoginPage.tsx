import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { formatCurrency } from '../lib/utils/calculations'
import { getCategoryIcon } from '../utils/categoryIcons'

export function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signInWithGoogle } = useAuth()

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)

    try {
      await signInWithGoogle()
    } catch {
      setError('Ошибка входа через Google')
    } finally {
      setLoading(false)
    }
  }

  // Демо данные для отображения
  const demoStats = {
    monthly: 15990,
    yearly: 191880,
    count: 12,
    average: 1332
  }

  const demoCategories = [
    { name: 'Мультисервис', amount: 5990, percentage: 37.5, color: '#ef4444' },
    { name: 'Развлечения', amount: 3499, percentage: 21.9, color: '#f59e0b' },
    { name: 'Работа', amount: 2999, percentage: 18.8, color: '#3b82f6' },
    { name: 'ИИ', amount: 2502, percentage: 15.7, color: '#10b981' },
    { name: 'Связь', amount: 1000, percentage: 6.3, color: '#8b5cf6' }
  ]

  const demoSubscriptions = [
    { name: 'Netflix', amount: 999, category: 'Развлечения', daysLeft: 3 },
    { name: 'Spotify', amount: 169, category: 'Развлечения', daysLeft: 7 },
    { name: 'ChatGPT Plus', amount: 1500, category: 'ИИ', daysLeft: 12 },
    { name: 'iCloud+', amount: 199, category: 'Работа', daysLeft: 15 }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Навигационная панель */}
      <nav className="relative z-10 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold gradient-text">SubTracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero секция */}
      <section className="relative overflow-hidden pt-16 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
              Управляйте подписками
              <span className="block gradient-text">легко и эффективно</span>
            </h2>
            <p className="max-w-2xl mx-auto text-xl text-gray-600 mb-10">
              Отслеживайте все свои подписки в одном месте, получайте напоминания о платежах 
              и контролируйте расходы с помощью удобной аналитики
            </p>
          </div>
        </div>
      </section>

      {/* Ключевые возможности */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Основные возможности</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Все подписки в одном месте</h4>
              <p className="text-gray-600">Храните информацию о всех ваших подписках в удобном интерфейсе</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Напоминания в календаре</h4>
              <p className="text-gray-600">Автоматические напоминания в Google Calendar за 3 дня до платежа</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Детальная аналитика</h4>
              <p className="text-gray-600">Визуализация расходов по категориям и периодам</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/25">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">AI Инсайты NEW!</h4>
              <p className="text-gray-600">Получайте персонализированные рекомендации по оптимизации подписок</p>
              <Link
                to="/demo"
                className="mt-3 inline-flex items-center text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
              >
                Попробовать демо →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Демонстрация интерфейса */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Как это выглядит</h3>
          
          {/* Статистические карточки */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="card">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">В месяц</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(demoStats.monthly, '₽')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">В год</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(demoStats.yearly, '₽')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Подписок</p>
                    <p className="text-2xl font-bold text-gray-900">{demoStats.count}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Средняя цена</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(demoStats.average, '₽')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Список подписок */}
            <div className="card">
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Предстоящие платежи</h4>
                <div className="space-y-3">
                  {demoSubscriptions.map((sub, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white`}
                          style={{ backgroundColor: demoCategories.find(c => c.name === sub.category)?.color || '#6b7280' }}>
                          {getCategoryIcon(sub.category, "w-5 h-5")}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{sub.name}</p>
                          <p className="text-sm text-gray-500">через {sub.daysLeft} дней</p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900">{formatCurrency(sub.amount, '₽')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Распределение по категориям */}
            <div className="card">
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Расходы по категориям</h4>
                <div className="space-y-4">
                  {demoCategories.map((category, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">{category.name}</span>
                        <span className="text-gray-600">{formatCurrency(category.amount, '₽')}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            backgroundColor: category.color,
                            width: `${category.percentage}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA секция */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Начните управлять подписками эффективно
          </h3>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к SubTracker и возьмите под контроль свои регулярные платежи
          </p>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl shadow-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-blue-600 disabled:opacity-50 transition-all duration-200"
          >
            <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? 'Вход...' : 'Начать с Google'}
          </button>
        </div>
      </section>
    </div>
  )
}