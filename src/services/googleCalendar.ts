import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { ensureGoogleApisLoaded } from './googleAuthLoader'

// Типы для Google Identity Services API
interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

interface TokenClientConfig {
  client_id: string
  scope: string
  prompt?: string
  callback: (response: TokenResponse) => void
  error_callback: (error: unknown) => void
}

interface TokenClient {
  requestAccessToken(): void
}

interface GoogleAccounts {
  oauth2: {
    initTokenClient(config: TokenClientConfig): TokenClient
  }
}

interface GoogleAPI {
  accounts: GoogleAccounts
}

declare global {
  interface Window {
    google: GoogleAPI | undefined
  }
}

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

  private async refreshAccessToken(promptType: 'silent' | 'consent' | 'select_account' = 'silent'): Promise<string | null> {
    try {
      // Убеждаемся, что Google APIs загружены
      const apisLoaded = await ensureGoogleApisLoaded()
      if (!apisLoaded) {
        console.error('Failed to load Google APIs')
        return null
      }

      // Проверяем, загружен ли Google Identity Services
      if (typeof window === 'undefined' || !window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        console.error('Google Identity Services not available')
        return null
      }

      return new Promise((resolve) => {
        let tokenResolved = false
        
        // Увеличиваем тайм-аут до 30 секунд
        const timeout = setTimeout(() => {
          if (!tokenResolved) {
            console.warn(`Token refresh timeout for prompt type: ${promptType}`)
            tokenResolved = true
            resolve(null)
          }
        }, 30000)

        try {
          const requestConfig: TokenClientConfig = {
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
            callback: async (response: TokenResponse) => {
              if (tokenResolved) return
              tokenResolved = true
              clearTimeout(timeout)
              
              try {
                if (response.access_token) {
                  // Обновляем токен в локальной сессии
                  if (this.session) {
                    this.session.provider_token = response.access_token
                    this.tokenExpiresAt = Date.now() + ((response.expires_in || 3600) * 1000)
                    // Сохраняем время истечения в localStorage для восстановления
                    localStorage.setItem('subtracker-token-expires', this.tokenExpiresAt.toString())
                  }
                  this.refreshAttempts = 0 // Reset attempts on success
                  console.log(`Token refresh successful with prompt: ${promptType}`)
                  resolve(response.access_token)
                } else {
                  console.warn(`No access token in response for prompt: ${promptType}`, response)
                  resolve(null)
                }
              } catch (error) {
                console.error('Error processing token response:', error)
                resolve(null)
              }
            },
            error_callback: (error: unknown) => {
              if (tokenResolved) return
              tokenResolved = true
              clearTimeout(timeout)
              console.warn(`Token refresh failed for prompt ${promptType}:`, error)
              resolve(null)
            }
          }

          // Настраиваем prompt в зависимости от типа
          if (promptType === 'silent') {
            // Не добавляем prompt для тихого обновления
          } else if (promptType === 'consent') {
            requestConfig.prompt = 'consent'
          } else if (promptType === 'select_account') {
            requestConfig.prompt = 'select_account'
          }

          const tokenClient = window.google!.accounts.oauth2.initTokenClient(requestConfig)
          
          // Запрашиваем новый токен
          tokenClient.requestAccessToken()
        } catch (error) {
          if (tokenResolved) return
          tokenResolved = true
          clearTimeout(timeout)
          console.error('Error initializing token client:', error)
          resolve(null)
        }
      })
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
      
      // Пробуем разные стратегии обновления с экспоненциальным backoff
      const strategies: Array<'silent' | 'consent' | 'select_account'> = ['silent', 'consent', 'select_account']
      
      for (let i = 0; i < strategies.length; i++) {
        if (this.refreshAttempts >= this.maxRefreshAttempts) {
          console.warn('Maximum refresh attempts reached')
          break
        }
        
        const strategy = strategies[i]
        this.refreshAttempts++
        
        console.log(`Attempting token refresh with strategy: ${strategy} (attempt ${this.refreshAttempts})`)
        const newToken = await this.refreshAccessToken(strategy)
        
        if (newToken) {
          console.log('Token refresh successful')
          return newToken
        }
        
        // Экспоненциальная задержка между попытками: 1s, 2s, 4s
        if (i < strategies.length - 1) {
          const delay = Math.pow(2, i) * 1000
          console.log(`Waiting ${delay}ms before next attempt...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
      
      console.error('All token refresh strategies failed')
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
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        if (retry) {
          // Сбрасываем время истечения чтобы форсировать обновление
          this.tokenExpiresAt = 0
          this.refreshAttempts = 0
          
          const newToken = await this.getAccessToken()
          if (newToken) {
            // Добавляем небольшую задержку перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 1000))
            return this.makeCalendarRequest(method, endpoint, body, false)
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
        return false
      }
      
      await this.makeCalendarRequest('GET', 'calendars/primary')
      return true
    } catch (error) {
      // Если это сетевая ошибка или ошибка токена, пробуем сбросить состояние
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        this.tokenExpiresAt = 0
        this.refreshAttempts = 0
        localStorage.removeItem('subtracker-token-expires')
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