import { useEffect, useCallback, useState } from 'react'
import { useAuth } from '../features/auth/useAuth'
import { googleCalendarService } from '../services/googleCalendar'
import { toast } from 'sonner'

export function useTokenRefresh() {
  const { session } = useAuth()
  const [tokenStatus, setTokenStatus] = useState<{
    hasToken: boolean
    isExpired: boolean
    expiresIn: number | null
  }>({ hasToken: false, isExpired: true, expiresIn: null })

  const checkTokenStatus = useCallback(async () => {
    const status = await googleCalendarService.getTokenStatus()
    setTokenStatus(status)
    return status
  }, [])

  const refreshToken = useCallback(async () => {
    try {
      const success = await googleCalendarService.forceTokenRefresh()
      if (success) {
        toast.success('Токен Google Calendar успешно обновлен')
        // Ждем немного перед проверкой статуса, чтобы убедиться что токен обновился
        await new Promise(resolve => setTimeout(resolve, 500))
        await checkTokenStatus()
        return true
      } else {
        toast.error('Не удалось обновить токен. Попробуйте войти заново.')
        return false
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
      toast.error('Ошибка при обновлении токена')
      return false
    }
  }, [checkTokenStatus])

  // Проверяем статус токена при монтировании и изменении сессии
  useEffect(() => {
    if (session?.provider_token) {
      const initializeToken = async () => {
        const status = await checkTokenStatus()
        
        // Если токен истек при загрузке, сразу пробуем обновить
        if (status.isExpired) {
          await refreshToken()
        } else {
          // Проверяем доступность календаря
          const isAccessible = await googleCalendarService.isCalendarAccessible()
          if (!isAccessible && status.hasToken) {
            await refreshToken()
          }
        }
      }
      
      initializeToken()
    }
  }, [session, checkTokenStatus, refreshToken])

  // Устанавливаем интервал для проактивного обновления токенов
  useEffect(() => {
    if (!session?.provider_token) return

    // Проверяем каждые 5 минут
    const interval = setInterval(async () => {
      const status = await checkTokenStatus()
      
      // Если токен истекает менее чем через 10 минут, обновляем
      if (status.hasToken && status.expiresIn !== null && status.expiresIn < 600) {
        await refreshToken()
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [session, checkTokenStatus, refreshToken])

  // Проверяем токен при возвращении на вкладку
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && session?.provider_token) {
        // Сначала проверяем доступность календаря
        const isAccessible = await googleCalendarService.isCalendarAccessible()
        if (!isAccessible) {
          const status = await checkTokenStatus()
          
          // Если токен истек или календарь недоступен, принудительно обновляем
          if (status.isExpired || !status.hasToken) {
            await refreshToken()
          } else {
            // Даже если токен не истек, но календарь недоступен, пробуем обновить
            await refreshToken()
          }
        } else {
          // Календарь доступен, но проверяем не истекает ли токен скоро
          const status = await checkTokenStatus()
          if (status.expiresIn !== null && status.expiresIn < 300) {
            await refreshToken()
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session, checkTokenStatus, refreshToken])

  // Обрабатываем восстановление сетевого соединения
  useEffect(() => {
    const handleOnline = async () => {
      if (session?.provider_token) {
        const isAccessible = await googleCalendarService.isCalendarAccessible()
        if (!isAccessible) {
          await refreshToken()
        }
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [session, refreshToken])

  return {
    tokenStatus,
    refreshToken,
    checkTokenStatus
  }
}