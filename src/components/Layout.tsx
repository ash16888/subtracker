import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { useSubscriptions } from '../features/subscriptions/hooks/useSubscriptions'
import { calculateMonthlyTotal, formatCurrency } from '../lib/utils/calculations'
import { GoogleCalendarStatus } from './GoogleCalendarStatus'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { signOut } = useAuth()
  const { data: subscriptions = [] } = useSubscriptions()
  const location = useLocation()
  
  const monthlyTotal = calculateMonthlyTotal(subscriptions)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">SubTracker</h1>
              {monthlyTotal > 0 && (
                <div className="ml-8 text-sm text-gray-600">
                  Расходы в этом месяце: 
                  <span className="font-semibold text-gray-900 ml-1">
                    {formatCurrency(monthlyTotal, '₽')}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-4">
                <Link
                  to="/"
                  className={`text-sm ${
                    location.pathname === '/' 
                      ? 'text-gray-900 font-medium' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Главная
                </Link>
                <Link
                  to="/settings"
                  className={`text-sm ${
                    location.pathname === '/settings' 
                      ? 'text-gray-900 font-medium' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Настройки
                </Link>
              </nav>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <GoogleCalendarStatus />
    </div>
  )
}