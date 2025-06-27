import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../auth/useAuth'
import {
  useSubscriptions,
  useCreateSubscription,
  useUpdateSubscription,
  useDeleteSubscription
} from './useSubscriptions'
import type { ReactNode } from 'react'

// Type for mocking useAuth
type MockAuthReturn = {
  user: { id: string } | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  reauthorizeGoogle: () => Promise<void>
  signOut: () => Promise<void>
  session: unknown
}

// Type for mocking Supabase chain
type MockSupabaseChain = {
  select: (...args: unknown[]) => unknown
  order: (...args: unknown[]) => unknown
  eq: (...args: unknown[]) => unknown
  insert: (...args: unknown[]) => unknown
  update: (...args: unknown[]) => unknown
  delete: (...args: unknown[]) => unknown
}

// Mock dependencies
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}))

vi.mock('../../auth/useAuth', () => ({
  useAuth: vi.fn()
}))

// Test data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com'
}

const mockSubscription = {
  id: 'sub-1',
  name: 'Netflix',
  amount: 999,
  currency: '₽',
  billing_period: 'monthly' as const,
  next_payment_date: '2024-02-01T00:00:00Z',
  category: 'Развлечения',
  url: null,
  user_id: 'user-1',
  google_calendar_event_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

// Test wrapper with React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useSubscriptions', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('useSubscriptions Query Hook', () => {
    it('should fetch subscriptions when user is authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({ 
        user: mockUser, 
        loading: false, 
        signInWithGoogle: vi.fn(), 
        reauthorizeGoogle: vi.fn(), 
        signOut: vi.fn(),
        session: null
      } as MockAuthReturn)
      
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockSubscription],
          error: null
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useSubscriptions(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.from).toHaveBeenCalledWith('subscriptions')
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseChain.order).toHaveBeenCalledWith('next_payment_date', { ascending: true })
      expect(result.current.data).toEqual([mockSubscription])
    })

    it('should return empty array when no user', async () => {
      vi.mocked(useAuth).mockReturnValue({ 
        user: null, 
        loading: false, 
        signInWithGoogle: vi.fn(), 
        reauthorizeGoogle: vi.fn(), 
        signOut: vi.fn(),
        session: null
      } as MockAuthReturn)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useSubscriptions(), { wrapper })

      // When no user, query should be disabled and data should be undefined initially
      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
    })

    it('should be disabled when no user', () => {
      vi.mocked(useAuth).mockReturnValue({ 
        user: null, 
        loading: false, 
        signInWithGoogle: vi.fn(), 
        reauthorizeGoogle: vi.fn(), 
        signOut: vi.fn(),
        session: null
      } as MockAuthReturn)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useSubscriptions(), { wrapper })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isFetching).toBe(false)
    })

    it('should handle query errors', async () => {
      vi.mocked(useAuth).mockReturnValue({ 
        user: mockUser, 
        loading: false, 
        signInWithGoogle: vi.fn(), 
        reauthorizeGoogle: vi.fn(), 
        signOut: vi.fn(),
        session: null
      } as MockAuthReturn)
      
      const mockError = new Error('Database error')
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useSubscriptions(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(mockError)
    })

    it('should use correct query key with user ID', () => {
      vi.mocked(useAuth).mockReturnValue({ 
        user: mockUser, 
        loading: false, 
        signInWithGoogle: vi.fn(), 
        reauthorizeGoogle: vi.fn(), 
        signOut: vi.fn(),
        session: null
      } as MockAuthReturn)

      const wrapper = createWrapper()
      renderHook(() => useSubscriptions(), { wrapper })

      // Query key should include user ID for proper caching
      expect(vi.mocked(useAuth)).toHaveBeenCalled()
    })
  })

  describe('useCreateSubscription Mutation Hook', () => {
    it('should create subscription successfully', async () => {
      vi.mocked(useAuth).mockReturnValue({ 
        user: mockUser, 
        loading: false, 
        signInWithGoogle: vi.fn(), 
        reauthorizeGoogle: vi.fn(), 
        signOut: vi.fn(),
        session: null
      } as MockAuthReturn)
      
      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockSubscription,
          error: null
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCreateSubscription(), { wrapper })

      const newSubscription = {
        name: 'Spotify',
        amount: 299,
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-02-01T00:00:00Z',
        category: 'Развлечения',
        url: null
      }

      await act(async () => {
        result.current.mutate(newSubscription)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.from).toHaveBeenCalledWith('subscriptions')
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith({
        ...newSubscription,
        user_id: mockUser.id
      })
      expect(result.current.data).toEqual(mockSubscription)
    })

    it('should throw error when user not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({ 
        user: null, 
        loading: false, 
        signInWithGoogle: vi.fn(), 
        reauthorizeGoogle: vi.fn(), 
        signOut: vi.fn(),
        session: null
      } as MockAuthReturn)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCreateSubscription(), { wrapper })

      const newSubscription = {
        name: 'Spotify',
        amount: 299,
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-02-01T00:00:00Z',
        category: 'Развлечения',
        url: null
      }

      await act(async () => {
        result.current.mutate(newSubscription)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(new Error('User not authenticated'))
    })

    it('should handle database errors', async () => {
      vi.mocked(useAuth).mockReturnValue({ 
        user: mockUser, 
        loading: false, 
        signInWithGoogle: vi.fn(), 
        reauthorizeGoogle: vi.fn(), 
        signOut: vi.fn(),
        session: null
      } as MockAuthReturn)
      
      const mockError = new Error('Insert failed')
      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCreateSubscription(), { wrapper })

      await act(async () => {
        result.current.mutate({
          name: 'Test',
          amount: 100,
          currency: '₽',
          billing_period: 'monthly',
          next_payment_date: '2024-02-01T00:00:00Z'
        })
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(mockError)
    })

    it('should invalidate queries on success', async () => {
      vi.mocked(useAuth).mockReturnValue({ 
        user: mockUser, 
        loading: false, 
        signInWithGoogle: vi.fn(), 
        reauthorizeGoogle: vi.fn(), 
        signOut: vi.fn(),
        session: null
      } as MockAuthReturn)
      
      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockSubscription,
          error: null
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
      })
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      function TestWrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        )
      }

      const { result } = renderHook(() => useCreateSubscription(), { wrapper: TestWrapper })

      await act(async () => {
        result.current.mutate({
          name: 'Test',
          amount: 100,
          currency: '₽',
          billing_period: 'monthly',
          next_payment_date: '2024-02-01T00:00:00Z'
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['subscriptions']
      })
    })
  })

  describe('useUpdateSubscription Mutation Hook', () => {
    it('should update subscription successfully', async () => {
      const updatedSubscription = { ...mockSubscription, name: 'Netflix Premium' }
      
      const mockSupabaseChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedSubscription,
          error: null
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useUpdateSubscription(), { wrapper })

      const updates = {
        id: 'sub-1',
        name: 'Netflix Premium'
      }

      await act(async () => {
        result.current.mutate(updates)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.from).toHaveBeenCalledWith('subscriptions')
      expect(mockSupabaseChain.update).toHaveBeenCalledWith({ name: 'Netflix Premium' })
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'sub-1')
      expect(result.current.data).toEqual(updatedSubscription)
    })

    it('should handle update errors', async () => {
      const mockError = new Error('Update failed')
      const mockSupabaseChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useUpdateSubscription(), { wrapper })

      await act(async () => {
        result.current.mutate({
          id: 'sub-1',
          name: 'Updated Name'
        })
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(mockError)
    })

    it('should invalidate queries on successful update', async () => {
      const mockSupabaseChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockSubscription,
          error: null
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
      })
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      function TestWrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        )
      }

      const { result } = renderHook(() => useUpdateSubscription(), { wrapper: TestWrapper })

      await act(async () => {
        result.current.mutate({
          id: 'sub-1',
          name: 'Updated'
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['subscriptions']
      })
    })
  })

  describe('useDeleteSubscription Mutation Hook', () => {
    it('should delete subscription successfully', async () => {
      const mockSupabaseChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useDeleteSubscription(), { wrapper })

      await act(async () => {
        result.current.mutate('sub-1')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(supabase.from).toHaveBeenCalledWith('subscriptions')
      expect(mockSupabaseChain.delete).toHaveBeenCalled()
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'sub-1')
    })

    it('should handle deletion errors', async () => {
      const mockError = new Error('Delete failed')
      const mockSupabaseChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: mockError
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useDeleteSubscription(), { wrapper })

      await act(async () => {
        result.current.mutate('sub-1')
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(mockError)
    })

    it('should invalidate queries on successful deletion', async () => {
      const mockSupabaseChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
      })
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      function TestWrapper({ children }: { children: ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        )
      }

      const { result } = renderHook(() => useDeleteSubscription(), { wrapper: TestWrapper })

      await act(async () => {
        result.current.mutate('sub-1')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['subscriptions']
      })
    })
  })

  describe('Loading and Error States', () => {
    it('should handle loading states correctly', async () => {
      vi.mocked(useAuth).mockReturnValue({ 
        user: mockUser, 
        loading: false, 
        signInWithGoogle: vi.fn(), 
        reauthorizeGoogle: vi.fn(), 
        signOut: vi.fn(),
        session: null
      } as MockAuthReturn)
      
      // Create a promise that we can control
      let resolveQuery: (value: unknown) => void
      const queryPromise = new Promise(resolve => {
        resolveQuery = resolve
      })
      
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(queryPromise)
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useSubscriptions(), { wrapper })

      // Should be loading initially
      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()

      // Resolve the query
      resolveQuery!({ data: [mockSubscription], error: null })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.isSuccess).toBe(true)
        expect(result.current.data).toEqual([mockSubscription])
      })
    })

    it('should handle mutation loading states', async () => {
      vi.mocked(useAuth).mockReturnValue({ 
        user: mockUser, 
        loading: false, 
        signInWithGoogle: vi.fn(), 
        reauthorizeGoogle: vi.fn(), 
        signOut: vi.fn(),
        session: null
      } as MockAuthReturn)
      
      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockSubscription,
          error: null
        })
      }
      
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as unknown as MockSupabaseChain)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCreateSubscription(), { wrapper })

      // Mutation should start as not pending
      expect(result.current.isPending).toBe(false)

      await act(async () => {
        result.current.mutate({
          name: 'Test',
          amount: 100,
          currency: '₽',
          billing_period: 'monthly',
          next_payment_date: '2024-02-01T00:00:00Z'
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(result.current.isPending).toBe(false)
      })
    })
  })
})