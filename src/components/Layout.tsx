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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="relative z-10 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold gradient-text">SubTracker</h1>
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
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === '/' 
                      ? 'text-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Главная
                </Link>
              </nav>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <GoogleCalendarStatus />
    </div>
  )
}