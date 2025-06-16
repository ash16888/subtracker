import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { ensureGoogleApisLoaded } from './googleAuthLoader'

interface CalendarEvent {
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  reminders: {
    useDefault: boolean
    overrides?: {
      method: 'email' | 'popup'
      minutes: number
    }[]
  }
}

class GoogleCalendarService {
  private session: Session | null = null
  private tokenExpiresAt: number = 0
  private refreshAttempts: number = 0
  private maxRefreshAttempts: number = 3

  private async getSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession()
    this.session = session
    return session
  }

  private async refreshAccessToken(prompt: '' | 'none' | 'select_account' = ''): Promise<string | null> {
    // Убеждаемся, что Google APIs загружены
    const apisLoaded = await ensureGoogleApisLoaded()
    if (!apisLoaded) {
      console.error('Failed to load Google APIs')
      return null
    }

    // Проверяем, загружен ли Google Identity Services
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      return new Promise((resolve) => {
        let tokenResolved = false
        const timeout = setTimeout(() => {
          if (!tokenResolved) {
            console.error('Token refresh timeout')
            resolve(null)
          }
        }, 10000) // 10 second timeout

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
          callback: async (response) => {
            tokenResolved = true
            clearTimeout(timeout)
            if (response.access_token) {
              // Обновляем токен в локальной сессии
              if (this.session) {
                this.session.provider_token = response.access_token
                this.tokenExpiresAt = Date.now() + ((response.expires_in || 3600) * 1000)
                // Сохраняем время истечения в localStorage для восстановления
                localStorage.setItem('subtracker-token-expires', this.tokenExpiresAt.toString())
              }
              this.refreshAttempts = 0 // Reset attempts on success
              resolve(response.access_token)
            } else {
              console.error('Failed to get new access token')
              resolve(null)
            }
          },
          error_callback: (error) => {
            tokenResolved = true
            clearTimeout(timeout)
            console.error('Error during token refresh:', error)
            resolve(null)
          }
        })
        
        // Запрашиваем новый токен с указанным prompt
        tokenClient.requestAccessToken({ prompt })
      })
    } else {
      console.error('Google Identity Services not loaded')
      return null
    }
  }

  private async getAccessToken(): Promise<string | null> {
    const session = await this.getSession()
    
    if (!session?.provider_token) {
      console.error('No Google access token available')
      return null
    }
    
    // Восстанавливаем время истечения из localStorage если нет в памяти
    if (!this.tokenExpiresAt) {
      const savedExpiry = localStorage.getItem('subtracker-token-expires')
      if (savedExpiry) {
        this.tokenExpiresAt = parseInt(savedExpiry, 10)
      }
    }
    
    // Проверяем, не истек ли токен (обновляем за 5 минут до истечения)
    if (this.tokenExpiresAt && Date.now() > this.tokenExpiresAt - 300000) {
      console.log('Access token expired or expiring soon, refreshing...')
      
      // Пробуем разные стратегии обновления
      const strategies: Array<'' | 'none' | 'select_account'> = ['', 'none', 'select_account']
      
      for (const strategy of strategies) {
        if (this.refreshAttempts >= this.maxRefreshAttempts) {
          console.error('Max refresh attempts reached')
          break
        }
        
        this.refreshAttempts++
        console.log(`Attempting token refresh with prompt: '${strategy}'`)
        const newToken = await this.refreshAccessToken(strategy)
        
        if (newToken) {
          return newToken
        }
        
        // Небольшая задержка между попытками
        if (strategy !== 'select_account') {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }
    
    return session.provider_token
  }

  private async makeCalendarRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: unknown,
    retry = true
  ): Promise<unknown> {
    const accessToken = await this.getAccessToken()
    if (!accessToken) {
      throw new Error('Google access token not available')
    }

    const response = await fetch(`https://www.googleapis.com/calendar/v3/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    // Если получили 401, пробуем обновить токен и повторить запрос
    if (response.status === 401 && retry) {
      console.log('Got 401, attempting to refresh token and retry...')
      
      // Сбрасываем время истечения чтобы форсировать обновление
      this.tokenExpiresAt = 0
      const newToken = await this.getAccessToken() // Используем getAccessToken с логикой retry
      
      if (newToken) {
        return this.makeCalendarRequest(method, endpoint, body, false)
      }
    }

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Calendar API error:', error)
      throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`)
    }

    // DELETE запросы возвращают пустой ответ (204 No Content)
    if (method === 'DELETE') {
      return null
    }

    return response.json()
  }

  async createPaymentReminder(subscriptionName: string, amount: number, currency: string, paymentDate: string): Promise<string | null> {
    try {
      // Создаем дату напоминания за 3 дня до платежа
      const reminderDate = new Date(paymentDate)
      reminderDate.setDate(reminderDate.getDate() - 3)
      
      // Устанавливаем время напоминания на 10:00
      reminderDate.setHours(10, 0, 0, 0)
      
      const endDate = new Date(reminderDate)
      endDate.setHours(10, 30, 0, 0) // 30 минут длительность

      const event: CalendarEvent = {
        summary: `Напоминание SubTracker: Платеж за ${subscriptionName}`,
        description: `Через 3 дня (${new Date(paymentDate).toLocaleDateString('ru-RU')}) будет списание ${amount} ${currency} за подписку на '${subscriptionName}'`,
        start: {
          dateTime: reminderDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'email', minutes: 60 }
          ]
        }
      }

      const result = await this.makeCalendarRequest('POST', 'calendars/primary/events', event)
      return (result as { id: string }).id
    } catch (error) {
      console.error('Error creating calendar event:', error)
      return null
    }
  }

  async updatePaymentReminder(eventId: string, subscriptionName: string, amount: number, currency: string, paymentDate: string): Promise<boolean> {
    try {
      // Получаем существующее событие
      const existingEvent = await this.makeCalendarRequest('GET', `calendars/primary/events/${eventId}`)
      
      // Создаем дату напоминания за 3 дня до платежа
      const reminderDate = new Date(paymentDate)
      reminderDate.setDate(reminderDate.getDate() - 3)
      
      // Устанавливаем время напоминания на 10:00
      reminderDate.setHours(10, 0, 0, 0)
      
      const endDate = new Date(reminderDate)
      endDate.setHours(10, 30, 0, 0)

      const updatedEvent = {
        ...(existingEvent as Record<string, unknown>),
        summary: `Напоминание SubTracker: Платеж за ${subscriptionName}`,
        description: `Через 3 дня (${new Date(paymentDate).toLocaleDateString('ru-RU')}) будет списание ${amount} ${currency} за подписку на '${subscriptionName}'`,
        start: {
          dateTime: reminderDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      }

      await this.makeCalendarRequest('PUT', `calendars/primary/events/${eventId}`, updatedEvent)
      return true
    } catch (error) {
      console.error('Error updating calendar event:', error)
      return false
    }
  }

  async deletePaymentReminder(eventId: string): Promise<boolean> {
    try {
      await this.makeCalendarRequest('DELETE', `calendars/primary/events/${eventId}`)
      return true
    } catch (error) {
      console.error('Error deleting calendar event:', error)
      return false
    }
  }

  async isCalendarAccessible(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken()
      if (!accessToken) return false
      
      await this.makeCalendarRequest('GET', 'calendars/primary')
      return true
    } catch (error) {
      console.error('Calendar not accessible:', error)
      return false
    }
  }

  // Метод для принудительного обновления токена
  async forceTokenRefresh(): Promise<boolean> {
    this.tokenExpiresAt = 0 // Сбрасываем время истечения
    this.refreshAttempts = 0 // Сбрасываем счетчик попыток
    const newToken = await this.getAccessToken()
    return !!newToken
  }
  
  // Метод для проверки состояния токена
  async getTokenStatus(): Promise<{
    hasToken: boolean
    isExpired: boolean
    expiresIn: number | null
  }> {
    const session = await this.getSession()
    const hasToken = !!session?.provider_token
    
    if (!hasToken || !this.tokenExpiresAt) {
      return { hasToken, isExpired: true, expiresIn: null }
    }
    
    const now = Date.now()
    const isExpired = now > this.tokenExpiresAt
    const expiresIn = isExpired ? null : Math.floor((this.tokenExpiresAt - now) / 1000)
    
    return { hasToken, isExpired, expiresIn }
  }
}

export const googleCalendarService = new GoogleCalendarService()