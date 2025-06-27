import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIService, aiService } from './aiService'
import type { GenerateInsightsRequest, GenerateInsightsResponse } from '../features/ai-insights/types/insights'
import type { Subscription } from '../types/subscription'
import { supabase } from '../lib/supabase'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null
      })
    }
  }
}))

// Mock environment variables
const mockEnv = {
  VITE_AI_API_KEY: undefined as string | undefined,
  VITE_AI_API_ENDPOINT: undefined as string | undefined
}

Object.defineProperty(import.meta, 'env', {
  get: () => mockEnv,
  configurable: true
})

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AIService', () => {
  let service: AIService

  beforeEach(() => {
    service = AIService.getInstance()
    vi.clearAllMocks()
    // Reset environment
    mockEnv.VITE_AI_API_KEY = undefined
    mockEnv.VITE_AI_API_ENDPOINT = undefined
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AIService.getInstance()
      const instance2 = AIService.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should return the same instance as the exported aiService', () => {
      expect(aiService).toBe(AIService.getInstance())
    })
  })

  describe('generateInsights', () => {
    const mockSubscriptions: Subscription[] = [
      {
        id: '1',
        name: 'Netflix',
        amount: 999,
        currency: '₽',
        billing_period: 'monthly',
        next_payment_date: '2024-02-01',
        category: 'Развлечения',
        url: null,
        user_id: 'user1',
        google_calendar_event_id: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: '2', 
        name: 'Spotify Premium',
        amount: 299,
        currency: '₽',
        billing_period: 'monthly',
        next_payment_date: '2024-02-01',
        category: 'Развлечения',
        url: null,
        user_id: 'user1',
        google_calendar_event_id: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }
    ]

    const mockRequest: GenerateInsightsRequest = {
      subscriptions: mockSubscriptions,
      userId: 'user1'
    }

    describe('Demo Mode (No API Configuration)', () => {
      it('should use demo mode when no API key is configured', async () => {
        mockEnv.VITE_AI_API_KEY = undefined
        mockEnv.VITE_AI_API_ENDPOINT = undefined

        const result = await service.generateInsights(mockRequest)

        expect(result.insights).toHaveLength(1)
        expect(result.insights[0].title).toBe('📊 Персональный анализ ваших подписок')
        expect(result.insights[0].type).toBe('analysis')
        expect(result.insights[0].priority).toBe('high')
        expect(typeof result.insights[0].description).toBe('string')
        expect(result.insights[0].description.length).toBeGreaterThan(100)
      })

      it('should use demo mode when API endpoint is missing', async () => {
        mockEnv.VITE_AI_API_KEY = 'test-key'
        mockEnv.VITE_AI_API_ENDPOINT = undefined

        const result = await service.generateInsights(mockRequest)

        expect(result.insights).toHaveLength(1)
        expect(result.insights[0].title).toBe('📊 Персональный анализ ваших подписок')
      })
    })

    describe('API Mode', () => {
      beforeEach(() => {
        mockEnv.VITE_AI_API_KEY = 'test-api-key'
        mockEnv.VITE_AI_API_ENDPOINT = 'https://mokgnucnjewmynwflhpc.supabase.co/functions/v1/ai-insights'
      })

      it('should call API when configured and session exists', async () => {
        const mockSession = {
          access_token: 'test-token',
          user: { id: 'user1' }
        }
        
        vi.mocked(supabase.auth.getSession).mockResolvedValue({
          data: { session: mockSession },
          error: null
        })

        const mockApiResponse = {
          insights: [{ id: 'api-1', title: 'API Insight' }],
          generatedAt: new Date()
        }

        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockApiResponse)
        })

        const result = await service.generateInsights(mockRequest)

        expect(mockFetch).toHaveBeenCalledWith('https://mokgnucnjewmynwflhpc.supabase.co/functions/v1/ai-insights', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscriptions: mockSubscriptions,
            userId: 'user1'
          })
        })

        expect(result).toEqual(mockApiResponse)
      })

      it('should fallback to demo mode when no session', async () => {
        vi.mocked(supabase.auth.getSession).mockResolvedValue({
          data: { session: null },
          error: null
        })

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const result = await service.generateInsights(mockRequest)

        expect(consoleSpy).toHaveBeenCalledWith('No active session, falling back to demo mode')
        expect(result.insights[0].title).toBe('📊 Персональный анализ ваших подписок')
        expect(mockFetch).not.toHaveBeenCalled()

        consoleSpy.mockRestore()
      })

      it('should fallback to demo mode on API error', async () => {
        const mockSession = {
          access_token: 'test-token',
          user: { id: 'user1' }
        }
        
        vi.mocked(supabase.auth.getSession).mockResolvedValue({
          data: { session: mockSession },
          error: null
        })

        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error')
        })

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const result = await service.generateInsights(mockRequest)

        expect(consoleSpy).toHaveBeenCalledWith('AI API error:', 500, 'Internal Server Error')
        expect(consoleWarnSpy).toHaveBeenCalledWith('Falling back to demo mode due to error')
        expect(result.insights[0].title).toBe('📊 Персональный анализ ваших подписок')

        consoleSpy.mockRestore()
        consoleWarnSpy.mockRestore()
      })

      it('should fallback to demo mode on network error', async () => {
        const mockSession = {
          access_token: 'test-token',
          user: { id: 'user1' }
        }
        
        vi.mocked(supabase.auth.getSession).mockResolvedValue({
          data: { session: mockSession },
          error: null
        })

        mockFetch.mockRejectedValue(new Error('Network error'))

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const result = await service.generateInsights(mockRequest)

        expect(consoleSpy).toHaveBeenCalledWith('Error generating insights:', expect.any(Error))
        expect(consoleWarnSpy).toHaveBeenCalledWith('Falling back to demo mode due to error')
        expect(result.insights[0].title).toBe('📊 Персональный анализ ваших подписок')

        consoleSpy.mockRestore()
        consoleWarnSpy.mockRestore()
      })
    })
  })

  describe('generateDemoInsights', () => {
    it('should generate insights for empty subscription list', () => {
      const request: GenerateInsightsRequest = {
        subscriptions: [],
        userId: 'user1'
      }

      const result = (service as any).generateDemoInsights(request)

      expect(result.insights).toHaveLength(1)
      expect(result.insights[0].potentialSavings).toBe(0)
      expect(result.insights[0].description).toContain('🎯')
    })

    it('should calculate monthly totals correctly', () => {
      const subscriptions: Subscription[] = [
        {
          id: '1',
          name: 'Monthly Service',
          amount: 1000,
          currency: '₽',
          billing_period: 'monthly',
          next_payment_date: '2024-02-01',
          category: 'Развлечения',
          url: null,
          user_id: 'user1',
          google_calendar_event_id: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        {
          id: '2',
          name: 'Yearly Service',
          amount: 12000,
          currency: '₽',
          billing_period: 'yearly',
          next_payment_date: '2024-02-01',
          category: 'Работа',
          url: null,
          user_id: 'user1',
          google_calendar_event_id: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]

      const request: GenerateInsightsRequest = {
        subscriptions,
        userId: 'user1'
      }

      const result = (service as any).generateDemoInsights(request)
      
      expect(result.insights[0].description).toContain('2000 ₽') // 1000 + 12000/12
    })

    it('should calculate potential savings for monthly subscriptions', () => {
      const subscriptions: Subscription[] = [
        {
          id: '1',
          name: 'Monthly Service',
          amount: 1000,
          currency: '₽',
          billing_period: 'monthly',
          next_payment_date: '2024-02-01',
          category: 'Развлечения',
          url: null,
          user_id: 'user1',
          google_calendar_event_id: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]

      const request: GenerateInsightsRequest = {
        subscriptions,
        userId: 'user1'
      }

      const result = (service as any).generateDemoInsights(request)
      
      // 15% скидка: 1000 * 12 * 0.15 / 12 = 150
      expect(result.insights[0].potentialSavings).toBe(150)
    })

    it('should include categories and names in analysis', () => {
      const subscriptions: Subscription[] = [
        {
          id: '1',
          name: 'Netflix',
          amount: 999,
          currency: '₽',
          billing_period: 'monthly',
          next_payment_date: '2024-02-01',
          category: 'Развлечения',
          url: null,
          user_id: 'user1',
          google_calendar_event_id: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        {
          id: '2',
          name: 'Spotify',
          amount: 299,
          currency: '₽',
          billing_period: 'monthly',
          next_payment_date: '2024-02-01',
          category: 'Развлечения',
          url: null,
          user_id: 'user1',
          google_calendar_event_id: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]

      const request: GenerateInsightsRequest = {
        subscriptions,
        userId: 'user1'
      }

      const result = (service as any).generateDemoInsights(request)
      
      expect(result.insights[0].description).toContain('Netflix')
      expect(result.insights[0].description).toContain('Spotify')
    })
  })

  describe('generatePersonalizedAnalysis', () => {
    it('should recognize Netflix and Spotify combination', () => {
      const subscriptions: Subscription[] = []
      const names = ['Netflix', 'Spotify Premium']
      const categories = ['Развлечения']
      
      const analysis = (service as any).generatePersonalizedAnalysis(
        subscriptions, names, categories, 1300, 2, 200
      )
      
      expect(analysis).toContain('Netflix и музыку со Spotify')
    })

    it('should detect YouTube Premium users', () => {
      const subscriptions: Subscription[] = []
      const names = ['YouTube Premium']
      const categories = ['Развлечения']
      
      const analysis = (service as any).generatePersonalizedAnalysis(
        subscriptions, names, categories, 500, 1, 75
      )
      
      expect(analysis).toContain('YouTube Premium показывает')
    })

    it('should recognize gaming interests', () => {
      const subscriptions: Subscription[] = []
      const names = ['Steam']
      const categories = ['Игры', 'Развлечения']
      
      const analysis = (service as any).generatePersonalizedAnalysis(
        subscriptions, names, categories, 800, 1, 100
      )
      
      expect(analysis).toContain('игры — важная часть')
    })

    it('should recognize work tools', () => {
      const subscriptions: Subscription[] = []
      const names = ['Microsoft Office']
      const categories = ['Работа']
      
      const analysis = (service as any).generatePersonalizedAnalysis(
        subscriptions, names, categories, 1200, 1, 150
      )
      
      expect(analysis).toContain('профессиональный подход')
    })

    it('should provide appropriate spending level comments', () => {
      const subscriptions: Subscription[] = []
      
      // Low spending
      const lowSpendingAnalysis = (service as any).generatePersonalizedAnalysis(
        subscriptions, [], [], 1500, 0, 0
      )
      expect(lowSpendingAnalysis).toContain('разумная сумма')
      
      // Medium spending
      const mediumSpendingAnalysis = (service as any).generatePersonalizedAnalysis(
        subscriptions, [], [], 3500, 0, 0
      )
      expect(mediumSpendingAnalysis).toContain('средний уровень')
      
      // High spending
      const highSpendingAnalysis = (service as any).generatePersonalizedAnalysis(
        subscriptions, [], [], 6000, 0, 0
      )
      expect(highSpendingAnalysis).toContain('довольно высокая сумма')
    })

    it('should suggest annual plans for monthly subscriptions', () => {
      const subscriptions: Subscription[] = []
      
      const analysis = (service as any).generatePersonalizedAnalysis(
        subscriptions, [], [], 2000, 3, 300
      )
      
      expect(analysis).toContain('3 подписок с месячной оплатой')
      expect(analysis).toContain('300 ₽ в месяц')
    })

    it('should provide recommendations based on missing services', () => {
      const subscriptions: Subscription[] = []
      
      // Has YouTube but not Spotify
      const analysisSpotify = (service as any).generatePersonalizedAnalysis(
        subscriptions, ['YouTube Premium'], [], 500, 1, 75
      )
      expect(analysisSpotify).toContain('Spotify Premium')
      
      // Has work tools but not Notion
      const analysisNotion = (service as any).generatePersonalizedAnalysis(
        subscriptions, ['Microsoft Office'], ['Работа'], 1000, 1, 150
      )
      expect(analysisNotion).toContain('Notion')
      
      // Has gaming but not Discord
      const analysisDiscord = (service as any).generatePersonalizedAnalysis(
        subscriptions, ['Steam'], ['Игры'], 800, 1, 100
      )
      expect(analysisDiscord).toContain('Discord Nitro')
    })

    it('should suggest creative and learning tools for light users', () => {
      const subscriptions: Subscription[] = []
      
      const analysis = (service as any).generatePersonalizedAnalysis(
        subscriptions, ['Basic Service'], [], 2500, 1, 100
      )
      
      expect(analysis).toContain('Adobe Creative Cloud')
      expect(analysis).toContain('Skillbox или GeekBrains')
    })

    it('should comment on subscription diversity', () => {
      const subscriptions: Subscription[] = Array(7).fill(null).map((_, i) => ({
        id: `${i}`,
        name: `Service ${i}`,
        amount: 500,
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-02-01',
        category: 'Развлечения',
        url: null,
        user_id: 'user1',
        google_calendar_event_id: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }))
      
      const analysis = (service as any).generatePersonalizedAnalysis(
        subscriptions, [], ['Развлечения', 'Работа', 'Игры', 'ИИ'], 3500, 0, 0
      )
      
      expect(analysis).toContain('4 категорий')
      expect(analysis).toContain('7 активных подписок')
    })

    it('should always end with encouraging message', () => {
      const subscriptions: Subscription[] = []
      
      const analysis = (service as any).generatePersonalizedAnalysis(
        subscriptions, [], [], 1000, 0, 0
      )
      
      expect(analysis).toContain('хорошо сбалансированный')
      expect(analysis).toContain('Удачного управления подписками!')
    })
  })
})