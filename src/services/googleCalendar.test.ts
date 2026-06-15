import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { googleCalendarService } from './googleCalendar'
import { supabase } from '../lib/supabase'

// Type for testing private methods
interface GoogleCalendarServiceForTesting {
  getSession(): Promise<unknown>
  refreshAccessToken(): Promise<string | null>
  getAccessToken(): Promise<string | null>
  makeCalendarRequest(method: string, endpoint: string, body?: unknown): Promise<unknown>
  accessToken: string | null
  sessionProviderToken: string | null
  tokenExpiresAt: number
  refreshAttempts: number
}

// Mock dependencies
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    },
    functions: {
      invoke: vi.fn()
    }
  }
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('GoogleCalendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {})
    localStorageMock.removeItem.mockImplementation(() => {})
    
    // Mock environment
    Object.defineProperty(import.meta, 'env', {
      get: () => ({ VITE_GOOGLE_CLIENT_ID: 'test-client-id' }),
      configurable: true
    })
    
    const service = googleCalendarService as unknown as GoogleCalendarServiceForTesting
    service.accessToken = null
    service.sessionProviderToken = null
    service.tokenExpiresAt = 0
    service.refreshAttempts = 0
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getSession', () => {
    it('should get session from Supabase', async () => {
      const mockSession = { user: { id: 'user1' }, provider_token: 'token123' }
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      // Access private method for testing
      const session = await (googleCalendarService as unknown as GoogleCalendarServiceForTesting).getSession()

      expect(supabase.auth.getSession).toHaveBeenCalled()
      expect(session).toEqual(mockSession)
    })

    it('should handle session retrieval error', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: new Error('Session error')
      })

      const session = await (googleCalendarService as unknown as GoogleCalendarServiceForTesting).getSession()

      expect(session).toBeNull()
    })
  })

  describe('refreshAccessToken', () => {
    it('should refresh the Google token through the authenticated edge function', async () => {
      const mockSession = {
        provider_token: 'old-token',
        provider_refresh_token: 'google-refresh-token'
      }
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { access_token: 'new-token', expires_in: 3600 },
        error: null
      })

      const token = await (googleCalendarService as unknown as GoogleCalendarServiceForTesting).refreshAccessToken()

      expect(token).toBe('new-token')
      expect(supabase.functions.invoke).toHaveBeenCalledWith('google-token-refresh', {
        body: { refreshToken: 'google-refresh-token' }
      })
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'subtracker-token-expires',
        expect.stringMatching(/^\d+$/)
      )
    })

    it('should return null when no Google refresh token is available', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'old-token' } },
        error: null
      })

      const token = await (googleCalendarService as unknown as GoogleCalendarServiceForTesting).refreshAccessToken()

      expect(token).toBeNull()
      expect(supabase.functions.invoke).not.toHaveBeenCalled()
    })
  })

  describe('getAccessToken', () => {
    it('should return null if no session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const token = await (googleCalendarService as unknown as GoogleCalendarServiceForTesting).getAccessToken()

      expect(token).toBeNull()
    })

    it('should return null if no provider token', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: { id: 'user1' } } },
        error: null
      })

      const token = await (googleCalendarService as unknown as GoogleCalendarServiceForTesting).getAccessToken()

      expect(token).toBeNull()
    })

    it('should return existing token if not expired', async () => {
      const futureTime = Date.now() + 3600000 // 1 hour in future
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'valid-token' } },
        error: null
      })
      
      // Set token expiry in the future
      ;(googleCalendarService as unknown as GoogleCalendarServiceForTesting).tokenExpiresAt = futureTime

      const token = await (googleCalendarService as unknown as GoogleCalendarServiceForTesting).getAccessToken()

      expect(token).toBe('valid-token')
    })

    it('should refresh token if expired', async () => {
      const pastTime = Date.now() - 3600000 // 1 hour in past

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            provider_token: 'expired-token',
            provider_refresh_token: 'google-refresh-token'
          }
        },
        error: null
      })
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { access_token: 'refreshed-token', expires_in: 3600 },
        error: null
      })
      const service = googleCalendarService as unknown as GoogleCalendarServiceForTesting
      service.accessToken = 'expired-token'
      service.sessionProviderToken = 'expired-token'
      service.tokenExpiresAt = pastTime

      const token = await service.getAccessToken()

      expect(token).toBe('refreshed-token')
    })
  })

  describe('makeCalendarRequest', () => {
    beforeEach(() => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'valid-token' } },
        error: null
      })
      
      // Set token as valid
      ;(googleCalendarService as unknown as GoogleCalendarServiceForTesting).tokenExpiresAt = Date.now() + 3600000
    })

    it('should make successful API request', async () => {
      const mockResponse = { id: 'event123', summary: 'Test Event' }
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await (googleCalendarService as unknown as GoogleCalendarServiceForTesting).makeCalendarRequest('GET', 'calendars/primary')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/calendar/v3/calendars/primary',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
            'Content-Type': 'application/json'
          },
          body: undefined
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should throw error if no access token', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      await expect(
        (googleCalendarService as unknown as GoogleCalendarServiceForTesting).makeCalendarRequest('GET', 'calendars/primary')
      ).rejects.toThrow('Google access token not available')
    })

    it('should handle 401 error and retry with new token', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            provider_token: 'expired-token',
            provider_refresh_token: 'google-refresh-token'
          }
        },
        error: null
      })
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { access_token: 'new-token', expires_in: 3600 },
        error: null
      })
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Unauthorized')
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'success' })
        })

      const result = await (googleCalendarService as unknown as GoogleCalendarServiceForTesting).makeCalendarRequest('GET', 'calendars/primary')

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://www.googleapis.com/calendar/v3/calendars/primary',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer new-token' })
        })
      )
      expect(result).toEqual({ id: 'success' })
    })

    it('should handle non-401 API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found')
      })

      await expect(
        (googleCalendarService as unknown as GoogleCalendarServiceForTesting).makeCalendarRequest('GET', 'calendars/primary')
      ).rejects.toThrow('Failed to access Google Calendar. Please try again.')
    })

    it.skip('should handle network errors with retry', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'success' })
        })

      const result = await (googleCalendarService as unknown as GoogleCalendarServiceForTesting).makeCalendarRequest('GET', 'calendars/primary')

      expect(result).toEqual({ id: 'success' })
    })

    it('should return null for DELETE requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204
      })

      const result = await (googleCalendarService as unknown as GoogleCalendarServiceForTesting).makeCalendarRequest('DELETE', 'calendars/primary/events/123')

      expect(result).toBeNull()
    })
  })

  describe('createPaymentReminder', () => {
    beforeEach(() => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'valid-token' } },
        error: null
      })
      ;(googleCalendarService as unknown as GoogleCalendarServiceForTesting).tokenExpiresAt = Date.now() + 3600000
    })

    it('should create calendar event successfully', async () => {
      const mockEventId = 'event123'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: mockEventId })
      })

      const result = await googleCalendarService.createPaymentReminder(
        'Netflix',
        999,
        '₽',
        '2024-02-01T00:00:00Z'
      )

      expect(result).toBe(mockEventId)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"summary":"Напоминание SubTracker: Платеж за Netflix"')
        })
      )
    })

    it('should return null on error', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'))

      const result = await googleCalendarService.createPaymentReminder(
        'Netflix',
        999,
        '₽',
        '2024-02-01T00:00:00Z'
      )

      expect(result).toBeNull()
    })

    it('should create event with correct date calculations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'event123' })
      })

      await googleCalendarService.createPaymentReminder(
        'Netflix',
        999,
        '₽',
        '2024-02-04T00:00:00Z' // Feb 4
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const reminderDate = new Date(callBody.start.dateTime)
      
      // Should be 3 days before payment date at 10:00
      expect(reminderDate.getDate()).toBe(1) // Feb 1
      expect(reminderDate.getHours()).toBe(10)
      expect(reminderDate.getMinutes()).toBe(0)
    })
  })

  describe('updatePaymentReminder', () => {
    beforeEach(() => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'valid-token' } },
        error: null
      })
      ;(googleCalendarService as unknown as GoogleCalendarServiceForTesting).tokenExpiresAt = Date.now() + 3600000
    })

    it('should update existing event successfully', async () => {
      const existingEvent = {
        id: 'event123',
        summary: 'Old Summary',
        description: 'Old Description'
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(existingEvent)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...existingEvent, summary: 'Updated' })
        })

      const result = await googleCalendarService.updatePaymentReminder(
        'event123',
        'Spotify',
        299,
        '₽',
        '2024-02-01T00:00:00Z'
      )

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      
      // First call should be GET to fetch existing event
      expect(mockFetch.mock.calls[0][0]).toContain('/events/event123')
      expect(mockFetch.mock.calls[0][1].method).toBe('GET')
      
      // Second call should be PUT to update
      expect(mockFetch.mock.calls[1][1].method).toBe('PUT')
      expect(mockFetch.mock.calls[1][1].body).toContain('Spotify')
    })

    it('should return false on error', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'))

      const result = await googleCalendarService.updatePaymentReminder(
        'event123',
        'Spotify',
        299,
        '₽',
        '2024-02-01T00:00:00Z'
      )

      expect(result).toBe(false)
    })
  })

  describe('deletePaymentReminder', () => {
    beforeEach(() => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'valid-token' } },
        error: null
      })
      ;(googleCalendarService as unknown as GoogleCalendarServiceForTesting).tokenExpiresAt = Date.now() + 3600000
    })

    it('should delete event successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204
      })

      const result = await googleCalendarService.deletePaymentReminder('event123')

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events/event123',
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should return false on error', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'))

      const result = await googleCalendarService.deletePaymentReminder('event123')

      expect(result).toBe(false)
    })
  })

  describe('isCalendarAccessible', () => {
    it('should return true if calendar is accessible', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'valid-token' } },
        error: null
      })
      ;(googleCalendarService as unknown as GoogleCalendarServiceForTesting).tokenExpiresAt = Date.now() + 3600000

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'primary' })
      })

      const result = await googleCalendarService.isCalendarAccessible()

      expect(result).toBe(true)
    })

    it('should return false if no access token', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await googleCalendarService.isCalendarAccessible()

      expect(result).toBe(false)
    })

    it.skip('should handle network errors and reset state', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'valid-token' } },
        error: null
      })
      ;(googleCalendarService as unknown as GoogleCalendarServiceForTesting).tokenExpiresAt = Date.now() + 3600000

      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await googleCalendarService.isCalendarAccessible()

      expect(result).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('subtracker-token-expires')
    })
  })

  describe('forceTokenRefresh', () => {
    it('should force refresh and return success', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            provider_token: 'old-token',
            provider_refresh_token: 'google-refresh-token'
          }
        },
        error: null
      })
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { access_token: 'new-token', expires_in: 3600 },
        error: null
      })

      const result = await googleCalendarService.forceTokenRefresh()

      expect(result).toBe(true)
      expect((googleCalendarService as unknown as GoogleCalendarServiceForTesting).tokenExpiresAt).toBeGreaterThan(Date.now())
      expect((googleCalendarService as unknown as GoogleCalendarServiceForTesting).refreshAttempts).toBe(0) // Should reset
    })
  })

  describe('getTokenStatus', () => {
    it('should return status when no token', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const status = await googleCalendarService.getTokenStatus()

      expect(status).toEqual({
        hasToken: false,
        isExpired: true,
        expiresIn: null
      })
    })

    it('should return status when token exists and not expired', async () => {
      const futureTime = Date.now() + 1800000 // 30 minutes in future
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'valid-token' } },
        error: null
      })
      ;(googleCalendarService as unknown as GoogleCalendarServiceForTesting).tokenExpiresAt = futureTime

      const status = await googleCalendarService.getTokenStatus()

      expect(status.hasToken).toBe(true)
      expect(status.isExpired).toBe(false)
      expect(status.expiresIn).toBeGreaterThan(1700) // Should be around 1800 seconds
    })

    it('should return status when token is expired', async () => {
      const pastTime = Date.now() - 3600000 // 1 hour in past
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'expired-token' } },
        error: null
      })
      const service = googleCalendarService as unknown as GoogleCalendarServiceForTesting
      service.accessToken = 'expired-token'
      service.sessionProviderToken = 'expired-token'
      service.tokenExpiresAt = pastTime

      const status = await googleCalendarService.getTokenStatus()

      expect(status.hasToken).toBe(true)
      expect(status.isExpired).toBe(true)
      expect(status.expiresIn).toBeNull()
    })

    it('should restore and set default expiry time when unknown', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'token' } },
        error: null
      })
      ;(googleCalendarService as unknown as GoogleCalendarServiceForTesting).tokenExpiresAt = 0

      const status = await googleCalendarService.getTokenStatus()

      expect(status.hasToken).toBe(true)
      expect(status.isExpired).toBe(false)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'subtracker-token-expires',
        expect.stringMatching(/^\d+$/)
      )
    })
  })
})
