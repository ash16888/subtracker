import { useState, useEffect } from 'react'
import { useAuth } from '../features/auth/useAuth'
import { googleCalendarService } from '../services/googleCalendar'

export function CalendarPermissionBanner() {
  const { user, reauthorizeGoogle } = useAuth()
  const [hasCalendarAccess, setHasCalendarAccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const isGoogleUser = user?.app_metadata?.provider === 'google'

  useEffect(() => {
    const checkCalendarAccess = async () => {
      if (!isGoogleUser) return
      
      try {
        const accessible = await googleCalendarService.isCalendarAccessible()
        setHasCalendarAccess(accessible)
      } catch (error) {
        console.error('Error checking calendar access:', error)
        setHasCalendarAccess(false)
      }
    }

    checkCalendarAccess()
  }, [isGoogleUser, user])

  const handleReauthorize = async () => {
    setIsLoading(true)
    try {
      await reauthorizeGoogle()
    } catch (error) {
      console.error('Error reauthorizing:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show banner if not a Google user or still checking
  if (!isGoogleUser || hasCalendarAccess === null) {
    return null
  }

  // Don't show banner if calendar access is already granted
  if (hasCalendarAccess) {
    return null
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Календарь Google недоступен
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Для автоматического создания напоминаний в Google Calendar требуется дополнительное разрешение. 
              Нажмите на кнопку ниже, чтобы предоставить доступ к календарю.
            </p>
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
              <button
                type="button"
                onClick={handleReauthorize}
                disabled={isLoading}
                className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600 disabled:opacity-50"
              >
                {isLoading ? 'Переавторизация...' : 'Предоставить доступ к календарю'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}