import { supabase } from '../lib/supabase'

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
  private async getAccessToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.provider_token) {
      console.error('No Google access token available')
      return null
    }
    
    return session.provider_token
  }

  private async makeCalendarRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ) {
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
      return result.id
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
        ...existingEvent,
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
}

export const googleCalendarService = new GoogleCalendarService()