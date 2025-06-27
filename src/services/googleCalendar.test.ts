import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { googleCalendarService } from './googleCalendar'
import { supabase } from '../lib/supabase'
import { ensureGoogleApisLoaded } from './googleAuthLoader'

// Mock dependencies
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    }
  }
}))

vi.mock('./googleAuthLoader', () => ({
  ensureGoogleApisLoaded: vi.fn()
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

// Mock Google APIs
const mockGoogleAPIs = {
  google: {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn()
      }
    }
  }
}

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
    
    // Reset global window state
    Object.assign(window, mockGoogleAPIs)
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
      const session = await (googleCalendarService as any).getSession()

      expect(supabase.auth.getSession).toHaveBeenCalled()
      expect(session).toEqual(mockSession)
    })

    it('should handle session retrieval error', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: new Error('Session error')
      })

      const session = await (googleCalendarService as any).getSession()

      expect(session).toBeNull()
    })
  })

  describe('refreshAccessToken', () => {
    beforeEach(() => {
      vi.mocked(ensureGoogleApisLoaded).mockResolvedValue(true)
    })

    it('should return null if Google APIs failed to load', async () => {
      vi.mocked(ensureGoogleApisLoaded).mockResolvedValue(false)

      const token = await (googleCalendarService as any).refreshAccessToken()

      expect(token).toBeNull()
    })

    it('should return null if Google Identity Services not available', async () => {
      Object.assign(window, { google: undefined })

      const token = await (googleCalendarService as any).refreshAccessToken()

      expect(token).toBeNull()
    })

    it.skip('should successfully refresh token', async () => {
      const mockTokenClient = {
        requestAccessToken: vi.fn()
      }
      
      Object.assign(window, mockGoogleAPIs)
      vi.mocked(ensureGoogleApisLoaded).mockResolvedValue(true)
      mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mockReturnValue(mockTokenClient)

      // Mock session
      const mockSession = { provider_token: 'old-token' }
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      // Execute token refresh and simulate successful callback
      const refreshPromise = (googleCalendarService as any).refreshAccessToken('')
      
      // Simulate callback being called immediately
      const initTokenClientCall = mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mock.calls[0]?.[0]
      if (initTokenClientCall?.callback) {
        initTokenClientCall.callback({
          access_token: 'new-token',
          expires_in: 3600
        })
      }

      const token = await refreshPromise

      expect(token).toBe('new-token')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'subtracker-token-expires',
        expect.stringMatching(/^\d+$/)
      )
    })

    it.skip('should handle token refresh failure', async () => {
      const mockTokenClient = {
        requestAccessToken: vi.fn()
      }
      
      Object.assign(window, mockGoogleAPIs)
      vi.mocked(ensureGoogleApisLoaded).mockResolvedValue(true)
      mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mockReturnValue(mockTokenClient)

      const refreshPromise = (googleCalendarService as any).refreshAccessToken('')
      
      // Simulate error callback immediately
      const initTokenClientCall = mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mock.calls[0]?.[0]
      if (initTokenClientCall?.error_callback) {
        initTokenClientCall.error_callback()
      }

      const token = await refreshPromise

      expect(token).toBeNull()
    })

    it.skip('should handle timeout', async () => {
      const mockTokenClient = {
        requestAccessToken: vi.fn()
      }
      
      Object.assign(window, mockGoogleAPIs)
      vi.mocked(ensureGoogleApisLoaded).mockResolvedValue(true)
      mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mockReturnValue(mockTokenClient)

      // Use fake timers for timeout testing
      vi.useFakeTimers()
      
      try {
        const refreshPromise = (googleCalendarService as any).refreshAccessToken('')
        
        // Fast-forward past timeout (10 seconds)
        vi.advanceTimersByTime(11000)
        
        const token = await refreshPromise
        expect(token).toBeNull()
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('getAccessToken', () => {
    it('should return null if no session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const token = await (googleCalendarService as any).getAccessToken()

      expect(token).toBeNull()
    })

    it('should return null if no provider token', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: { id: 'user1' } } },
        error: null
      })

      const token = await (googleCalendarService as any).getAccessToken()

      expect(token).toBeNull()
    })

    it('should return existing token if not expired', async () => {
      const futureTime = Date.now() + 3600000 // 1 hour in future
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'valid-token' } },
        error: null
      })
      
      // Set token expiry in the future
      ;(googleCalendarService as any).tokenExpiresAt = futureTime

      const token = await (googleCalendarService as any).getAccessToken()

      expect(token).toBe('valid-token')
    })

    it.skip('should refresh token if expired', async () => {
      const pastTime = Date.now() - 3600000 // 1 hour in past
      
      Object.assign(window, mockGoogleAPIs)
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'expired-token' } },
        error: null
      })
      vi.mocked(ensureGoogleApisLoaded).mockResolvedValue(true)
      
      // Set token as expired
      ;(googleCalendarService as any).tokenExpiresAt = pastTime

      const mockTokenClient = {
        requestAccessToken: vi.fn()
      }
      mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mockReturnValue(mockTokenClient)

      const tokenPromise = (googleCalendarService as any).getAccessToken()
      
      // Simulate successful refresh immediately
      const initTokenClientCall = mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mock.calls[0]?.[0]
      if (initTokenClientCall?.callback) {
        initTokenClientCall.callback({
          access_token: 'refreshed-token',
          expires_in: 3600
        })
      }

      const token = await tokenPromise

      expect(token).toBe('refreshed-token')
    })

    it.skip('should restore token expiry from localStorage', async () => {
      const savedTime = (Date.now() + 3600000).toString()
      localStorageMock.getItem.mockReturnValue(savedTime)
      
      vi.mocked(ensureGoogleApisLoaded).mockResolvedValue(true)
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'token' } },
        error: null
      })

      const token = await (googleCalendarService as any).getAccessToken()

      expect(localStorageMock.getItem).toHaveBeenCalledWith('subtracker-token-expires')
      expect(token).toBe('token')
    })
  })

  describe('makeCalendarRequest', () => {
    beforeEach(() => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'valid-token' } },
        error: null
      })
      
      // Set token as valid
      ;(googleCalendarService as any).tokenExpiresAt = Date.now() + 3600000
    })

    it('should make successful API request', async () => {
      const mockResponse = { id: 'event123', summary: 'Test Event' }
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await (googleCalendarService as any).makeCalendarRequest('GET', 'calendars/primary')

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
        (googleCalendarService as any).makeCalendarRequest('GET', 'calendars/primary')
      ).rejects.toThrow('Google access token not available')
    })

    it('should handle 401 error and retry with new token', async () => {
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

      Object.assign(window, mockGoogleAPIs)
      vi.mocked(ensureGoogleApisLoaded).mockResolvedValue(true)
      const mockTokenClient = {
        requestAccessToken: vi.fn()
      }
      mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mockReturnValue(mockTokenClient)

      const requestPromise = (googleCalendarService as any).makeCalendarRequest('GET', 'calendars/primary')
      
      // Simulate token refresh immediately
      const initTokenClientCall = mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mock.calls[0]?.[0]
      if (initTokenClientCall?.callback) {
        initTokenClientCall.callback({
          access_token: 'new-token',
          expires_in: 3600
        })
      }

      const result = await requestPromise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ id: 'success' })
    })

    it('should handle non-401 API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found')
      })

      await expect(
        (googleCalendarService as any).makeCalendarRequest('GET', 'calendars/primary')
      ).rejects.toThrow('Failed to access Google Calendar. Please try again.')
    })

    it.skip('should handle network errors with retry', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'success' })
        })

      Object.assign(window, mockGoogleAPIs)
      vi.mocked(ensureGoogleApisLoaded).mockResolvedValue(true)
      const mockTokenClient = {
        requestAccessToken: vi.fn()
      }
      mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mockReturnValue(mockTokenClient)

      const requestPromise = (googleCalendarService as any).makeCalendarRequest('GET', 'calendars/primary')
      
      // Simulate token refresh immediately
      const initTokenClientCall = mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mock.calls[0]?.[0]
      if (initTokenClientCall?.callback) {
        initTokenClientCall.callback({
          access_token: 'new-token',
          expires_in: 3600
        })
      }

      const result = await requestPromise

      expect(result).toEqual({ id: 'success' })
    })

    it('should return null for DELETE requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204
      })

      const result = await (googleCalendarService as any).makeCalendarRequest('DELETE', 'calendars/primary/events/123')

      expect(result).toBeNull()
    })
  })

  describe('createPaymentReminder', () => {
    beforeEach(() => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'valid-token' } },
        error: null
      })
      ;(googleCalendarService as any).tokenExpiresAt = Date.now() + 3600000
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
      ;(googleCalendarService as any).tokenExpiresAt = Date.now() + 3600000
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
      ;(googleCalendarService as any).tokenExpiresAt = Date.now() + 3600000
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
      ;(googleCalendarService as any).tokenExpiresAt = Date.now() + 3600000

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
      ;(googleCalendarService as any).tokenExpiresAt = Date.now() + 3600000

      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await googleCalendarService.isCalendarAccessible()

      expect(result).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('subtracker-token-expires')
    })
  })

  describe('forceTokenRefresh', () => {
    it('should force refresh and return success', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { provider_token: 'old-token' } },
        error: null
      })
      vi.mocked(ensureGoogleApisLoaded).mockResolvedValue(true)

      const mockTokenClient = {
        requestAccessToken: vi.fn()
      }
      mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mockReturnValue(mockTokenClient)

      const refreshPromise = googleCalendarService.forceTokenRefresh()
      
      // Simulate successful refresh
      setTimeout(() => {
        const initTokenClientCall = mockGoogleAPIs.google.accounts.oauth2.initTokenClient.mock.calls[0][0]
        initTokenClientCall.callback({
          access_token: 'new-token',
          expires_in: 3600
        })
      }, 0)

      const result = await refreshPromise

      expect(result).toBe(true)
      expect((googleCalendarService as any).tokenExpiresAt).toBe(0) // Should reset
      expect((googleCalendarService as any).refreshAttempts).toBe(0) // Should reset
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
      ;(googleCalendarService as any).tokenExpiresAt = futureTime

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
      ;(googleCalendarService as any).tokenExpiresAt = pastTime

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
      ;(googleCalendarService as any).tokenExpiresAt = 0

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