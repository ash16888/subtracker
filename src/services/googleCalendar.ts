import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'


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
  // @ts-expect-error - используется для кэширования сессии
  private session: Session | null = null
  private tokenExpiresAt: number = 0
  private refreshAttempts: number = 0
  private maxRefreshAttempts: number = 3

  private async getSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession()
    this.session = session
    return session
  }

  private async refreshAccessToken(): Promise<string | null> {
    try {
      console.log('Google OAuth token expired, user needs to re-authenticate')
      
      // Google OAuth токены не могут быть обновлены без повторной авторизации
      // Пользователь должен заново предоставить права доступа к Google Calendar
      
      // Сбрасываем время истечения токена
      this.tokenExpiresAt = 0
      localStorage.removeItem('subtracker-token-expires')
      
      // Показываем пользователю сообщение о необходимости повторной авторизации
      // Это будет обработано компонентом GoogleCalendarStatus
      console.warn('Google Calendar access token expired. Please re-authorize access to Google Calendar.')
      
      return null
    } catch (error) {
      console.error('Error in refreshAccessToken:', error)
      return null
    }
  }

  private async getAccessToken(): Promise<string | null> {
    const session = await this.getSession()
    
    if (!session?.provider_token) {
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
      console.log('Token is expiring soon, attempting refresh...')
      
      // Ограничиваем количество попыток обновления
      if (this.refreshAttempts >= this.maxRefreshAttempts) {
        console.warn('Maximum refresh attempts reached')
        return session.provider_token
      }
      
      this.refreshAttempts++
      console.log(`Attempting token refresh (attempt ${this.refreshAttempts})`)
      
      const newToken = await this.refreshAccessToken()
      
      if (newToken) {
        console.log('Token refresh successful')
        return newToken
      } else {
        console.warn('Token refresh failed, using existing token')
        
        // Если не удалось обновить токен, попробуем подождать перед следующей попыткой
        if (this.refreshAttempts < this.maxRefreshAttempts) {
          const delay = Math.pow(2, this.refreshAttempts - 1) * 1000 // 1s, 2s, 4s
          console.log(`Waiting ${delay}ms before next attempt...`)
          await new Promise(resolve => setTimeout(resolve, delay))
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

    try {
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
        // Сбрасываем время истечения чтобы форсировать обновление
        this.tokenExpiresAt = 0
        const newToken = await this.getAccessToken()
        
        if (newToken) {
          return this.makeCalendarRequest(method, endpoint, body, false)
        }
      }

      if (!response.ok) {
        await response.text()
        throw new Error('Failed to access Google Calendar. Please try again.')
      }

      // DELETE запросы возвращают пустой ответ (204 No Content)
      if (method === 'DELETE') {
        return null
      }

      return response.json()
    } catch (error) {
      // Обрабатываем сетевые ошибки (включая ERR_SOCKET_NOT_CONNECTED)
      if (error instanceof TypeError) {
        const errorMessage = error.message.toLowerCase()
        
        if (errorMessage.includes('failed to fetch') || 
            errorMessage.includes('socket') || 
            errorMessage.includes('network')) {
          
          console.warn(`Network error accessing Google Calendar: ${error.message}`)
          
          if (retry) {
            console.log('Retrying request after network error...')
            
            // Добавляем задержку перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // Пытаемся еще раз без обновления токена
            return this.makeCalendarRequest(method, endpoint, body, false)
          } else {
            console.error('Network error persists after retry')
          }
        }
      }
      
      // Перебрасываем ошибку дальше
      throw error
    }
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
    } catch {
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
    } catch {
      return false
    }
  }

  async deletePaymentReminder(eventId: string): Promise<boolean> {
    try {
      await this.makeCalendarRequest('DELETE', `calendars/primary/events/${eventId}`)
      return true
    } catch {
      return false
    }
  }

  async isCalendarAccessible(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken()
      if (!accessToken) {
        console.log('No access token available for Google Calendar')
        return false
      }
      
      await this.makeCalendarRequest('GET', 'calendars/primary')
      return true
    } catch (error) {
      // Логируем ошибку для диагностики
      if (error instanceof Error) {
        console.warn('Google Calendar access check failed:', error.message)
        
        // Если это сетевая ошибка, не сбрасываем токен сразу
        if (error instanceof TypeError) {
          const errorMessage = error.message.toLowerCase()
          if (errorMessage.includes('failed to fetch') || 
              errorMessage.includes('socket') || 
              errorMessage.includes('network')) {
            console.log('Network error detected, keeping token for retry')
            // Не сбрасываем токен при сетевых ошибках
            return false
          }
        }
        
        // Для других ошибок (401, 403) сбрасываем токен
        if (error.message.includes('401') || error.message.includes('403')) {
          console.log('Authorization error, clearing token')
          this.tokenExpiresAt = 0
          this.refreshAttempts = 0
          localStorage.removeItem('subtracker-token-expires')
        }
      }
      
      return false
    }
  }

  // Метод для принудительного обновления токена
  async forceTokenRefresh(): Promise<boolean> {
    this.tokenExpiresAt = 0
    this.refreshAttempts = 0
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
    
    if (!hasToken) {
      return { hasToken: false, isExpired: true, expiresIn: null }
    }
    
    // Восстанавливаем время истечения из localStorage если нет в памяти
    if (!this.tokenExpiresAt) {
      const savedExpiry = localStorage.getItem('subtracker-token-expires')
      if (savedExpiry) {
        this.tokenExpiresAt = parseInt(savedExpiry, 10)
      }
    }
    
    // Если время истечения неизвестно, считаем токен активным
    if (!this.tokenExpiresAt) {
      // Устанавливаем время истечения на 50 минут вперед
      this.tokenExpiresAt = Date.now() + (50 * 60 * 1000)
      localStorage.setItem('subtracker-token-expires', this.tokenExpiresAt.toString())
    }
    
    const now = Date.now()
    const isExpired = now > this.tokenExpiresAt
    const expiresIn = isExpired ? null : Math.floor((this.tokenExpiresAt - now) / 1000)
    
    return { hasToken, isExpired, expiresIn }
  }
}

export const googleCalendarService = new GoogleCalendarService()