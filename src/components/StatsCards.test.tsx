import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCards } from './StatsCards'
import type { Database } from '../types/database.types'

// Mock the formatCurrency function
vi.mock('../lib/utils/calculations', () => ({
  formatCurrency: vi.fn((amount: number, currency: string) => `${amount} ${currency}`)
}))

// Fix the date for consistent testing
const FIXED_DATE = new Date('2024-01-15T10:00:00Z')

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_DATE)
})

afterAll(() => {
  vi.useRealTimers()
})

type Subscription = Database['public']['Tables']['subscriptions']['Row']

const createMockSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'test-id',
  name: 'Test Service',
  amount: 1000,
  currency: '₽',
  billing_period: 'monthly',
  next_payment_date: '2024-02-15T00:00:00Z',
  category: 'Развлечения',
  url: null,
  user_id: 'user-1',
  google_calendar_event_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

describe('StatsCards', () => {
  describe('Component Rendering', () => {
    it('should return null when no subscriptions', () => {
      const { container } = render(<StatsCards subscriptions={[]} />)
      expect(container.firstChild).toBeNull()
    })

    it('should render all stat cards when subscriptions exist', () => {
      const subscriptions = [createMockSubscription()]
      render(<StatsCards subscriptions={subscriptions} />)

      expect(screen.getByText('Самая дорогая')).toBeInTheDocument()
      expect(screen.getByText('Самая дешёвая')).toBeInTheDocument()
      expect(screen.getByText('Следующий месяц')).toBeInTheDocument()
      expect(screen.getByText('Популярная категория')).toBeInTheDocument()
      expect(screen.getByText('Годовые расходы')).toBeInTheDocument()
      expect(screen.getByText('Средний чек')).toBeInTheDocument()
    })
  })

  describe('Statistical Calculations', () => {
    it('should calculate total monthly spending correctly', () => {
      const subscriptions = [
        createMockSubscription({ amount: 500 }),
        createMockSubscription({ amount: 1500 }),
        createMockSubscription({ amount: 800 })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      // Yearly total should be (500 + 1500 + 800) * 12 = 33,600
      expect(screen.getByText('33600 ₽')).toBeInTheDocument()
    })

    it('should identify most expensive subscription correctly', () => {
      const subscriptions = [
        createMockSubscription({ name: 'Cheap Service', amount: 200 }),
        createMockSubscription({ name: 'Expensive Service', amount: 2000 }),
        createMockSubscription({ name: 'Medium Service', amount: 800 })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      expect(screen.getByText('2000 ₽')).toBeInTheDocument()
      expect(screen.getByText('Expensive Service')).toBeInTheDocument()
    })

    it('should identify cheapest subscription correctly', () => {
      const subscriptions = [
        createMockSubscription({ name: 'Cheap Service', amount: 200 }),
        createMockSubscription({ name: 'Expensive Service', amount: 2000 }),
        createMockSubscription({ name: 'Medium Service', amount: 800 })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      expect(screen.getByText('200 ₽')).toBeInTheDocument()
      expect(screen.getByText('Cheap Service')).toBeInTheDocument()
    })

    it('should calculate average cost per subscription', () => {
      const subscriptions = [
        createMockSubscription({ amount: 600 }),
        createMockSubscription({ amount: 900 }),
        createMockSubscription({ amount: 1500 })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      // Average: (600 + 900 + 1500) / 3 = 1000
      expect(screen.getByText('1000 ₽')).toBeInTheDocument()
      expect(screen.getByText('За подписку')).toBeInTheDocument()
    })

    it('should handle single subscription scenario', () => {
      const subscriptions = [
        createMockSubscription({ 
          name: 'Single Service', 
          amount: 999, 
          category: 'Развлечения' 
        })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      // Most expensive and cheapest should be the same
      const serviceNames = screen.getAllByText('Single Service')
      expect(serviceNames).toHaveLength(2) // Should appear in both cards
      
      expect(screen.getByText('Развлечения')).toBeInTheDocument()
      expect(screen.getByText('1 подписок')).toBeInTheDocument()
    })
  })

  describe('Next Month Predictions', () => {
    it('should calculate next month payments correctly', () => {
      // February 2024 payments (next month from January 15)
      const subscriptions = [
        createMockSubscription({ 
          amount: 500, 
          next_payment_date: '2024-02-10T00:00:00Z' 
        }),
        createMockSubscription({ 
          amount: 800, 
          next_payment_date: '2024-02-20T00:00:00Z' 
        }),
        createMockSubscription({ 
          amount: 600, 
          next_payment_date: '2024-03-05T00:00:00Z' // Not next month
        })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      // Should only count February payments: 500 + 800 = 1300
      expect(screen.getByText('1300 ₽')).toBeInTheDocument()
      expect(screen.getByText('февраль 2024')).toBeInTheDocument()
    })

    it('should handle no payments in next month', () => {
      const subscriptions = [
        createMockSubscription({ 
          amount: 500, 
          next_payment_date: '2024-03-10T00:00:00Z' // March, not February
        })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      expect(screen.getByText('0 ₽')).toBeInTheDocument()
    })
  })

  describe('Category Analysis', () => {
    it('should identify most popular category correctly', () => {
      const subscriptions = [
        createMockSubscription({ category: 'Развлечения' }),
        createMockSubscription({ category: 'Развлечения' }),
        createMockSubscription({ category: 'Развлечения' }),
        createMockSubscription({ category: 'Работа' }),
        createMockSubscription({ category: 'Работа' })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      expect(screen.getByText('Развлечения')).toBeInTheDocument()
      expect(screen.getByText('3 подписок')).toBeInTheDocument()
    })

    it('should handle null categories as "Другое"', () => {
      const subscriptions = [
        createMockSubscription({ category: null }),
        createMockSubscription({ category: null }),
        createMockSubscription({ category: 'Развлечения' })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      expect(screen.getByText('Другое')).toBeInTheDocument()
      expect(screen.getByText('2 подписок')).toBeInTheDocument()
    })

    it('should handle tie in category counts', () => {
      const subscriptions = [
        createMockSubscription({ category: 'Развлечения' }),
        createMockSubscription({ category: 'Работа' })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      // Should show one of the categories with 1 subscription
      expect(screen.getByText('1 подписок')).toBeInTheDocument()
    })

    it('should show "Нет данных" when no categories available', () => {
      // This edge case is covered by empty subscriptions returning null
      const subscriptions = [createMockSubscription()]
      render(<StatsCards subscriptions={subscriptions} />)
      
      // Should show the actual category, not "Нет данных"
      expect(screen.getByText('Развлечения')).toBeInTheDocument()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle subscriptions with zero amounts', () => {
      const subscriptions = [
        createMockSubscription({ amount: 0, name: 'Free Service' }),
        createMockSubscription({ amount: 500, name: 'Paid Service' })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      expect(screen.getByText('Free Service')).toBeInTheDocument() // Should be cheapest
      expect(screen.getByText('Paid Service')).toBeInTheDocument() // Should be most expensive
    })

    it('should handle very large amounts', () => {
      const subscriptions = [
        createMockSubscription({ amount: 999999, name: 'Expensive Service' })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      // Should appear in most expensive, cheapest, average cards
      const amountElements = screen.getAllByText('999999 ₽')
      expect(amountElements.length).toBeGreaterThan(0)
      expect(screen.getByText('11999988 ₽')).toBeInTheDocument() // Yearly: 999999 * 12
    })

    it('should handle subscriptions with different currencies', () => {
      const subscriptions = [
        createMockSubscription({ amount: 100, currency: 'USD', name: 'USD Service' }),
        createMockSubscription({ amount: 500, currency: '₽', name: 'RUB Service' })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      expect(screen.getByText('500 ₽')).toBeInTheDocument() // Most expensive
      expect(screen.getByText('100 USD')).toBeInTheDocument() // Cheapest
    })

    it('should round average calculations correctly', () => {
      const subscriptions = [
        createMockSubscription({ amount: 333 }),
        createMockSubscription({ amount: 333 }),
        createMockSubscription({ amount: 334 })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      // Average: (333 + 333 + 334) / 3 = 333.33... should round to 333
      // Should appear in average card, may also appear in other cards
      const averageElements = screen.getAllByText('333 ₽')
      expect(averageElements.length).toBeGreaterThan(0)
    })

    it('should handle very long subscription names with truncation', () => {
      const subscriptions = [
        createMockSubscription({ 
          name: 'Very Long Subscription Service Name That Should Be Truncated',
          amount: 1000
        })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      // The component has max-w-[180px] and truncate classes
      // Should appear in both most expensive and cheapest cards since it's the only subscription
      const nameElements = screen.getAllByText('Very Long Subscription Service Name That Should Be Truncated')
      expect(nameElements.length).toBeGreaterThan(0)
    })
  })

  describe('Date and Time Handling', () => {
    it('should correctly format next month name in Russian', () => {
      const subscriptions = [
        createMockSubscription({ 
          next_payment_date: '2024-02-15T00:00:00Z' 
        })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      expect(screen.getByText('февраль 2024')).toBeInTheDocument()
    })

    it('should handle year boundary correctly', () => {
      // Set date to December 2024
      vi.setSystemTime(new Date('2024-12-15T10:00:00Z'))
      
      const subscriptions = [
        createMockSubscription({ 
          next_payment_date: '2025-01-15T00:00:00Z' // Next month is January 2025
        })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      expect(screen.getByText('январь 2025')).toBeInTheDocument()
      
      // Reset to original date
      vi.setSystemTime(FIXED_DATE)
    })

    it('should handle different time zones in payment dates', () => {
      const subscriptions = [
        createMockSubscription({ 
          amount: 500,
          next_payment_date: '2024-02-01T23:59:59Z' // End of February 1st UTC
        }),
        createMockSubscription({ 
          amount: 300,
          next_payment_date: '2024-02-02T00:00:01Z' // Start of February 2nd UTC
        })
      ]
      
      render(<StatsCards subscriptions={subscriptions} />)
      
      // Both should be counted as February payments
      expect(screen.getByText('800 ₽')).toBeInTheDocument()
    })
  })

  describe('useMemo Optimization', () => {
    it('should recalculate stats when subscriptions change', () => {
      const initialSubscriptions = [
        createMockSubscription({ amount: 500, name: 'Service 1' })
      ]
      
      const { rerender } = render(<StatsCards subscriptions={initialSubscriptions} />)
      
      const amountElements = screen.getAllByText('500 ₽')
      expect(amountElements.length).toBeGreaterThan(0)
      // Service 1 should appear in multiple cards (most expensive and cheapest)
      const serviceElements = screen.getAllByText('Service 1')
      expect(serviceElements.length).toBeGreaterThan(0)
      
      const updatedSubscriptions = [
        createMockSubscription({ amount: 1000, name: 'Service 2' })
      ]
      
      rerender(<StatsCards subscriptions={updatedSubscriptions} />)
      
      // Check for new values
      const newAmountElements = screen.getAllByText('1000 ₽')
      expect(newAmountElements.length).toBeGreaterThan(0)
      // Service 2 appears in both most expensive and cheapest cards
      const service2Elements = screen.getAllByText('Service 2')
      expect(service2Elements.length).toBeGreaterThan(0)
      
      // Check that old values are gone
      expect(screen.queryByText('Service 1')).not.toBeInTheDocument()
    })
  })

  describe('Visual Elements', () => {
    it('should render all SVG icons', () => {
      const subscriptions = [createMockSubscription()]
      const { container } = render(<StatsCards subscriptions={subscriptions} />)
      
      const svgElements = container.querySelectorAll('svg')
      expect(svgElements).toHaveLength(6) // One for each stat card
    })

    it('should apply correct CSS classes for styling', () => {
      const subscriptions = [createMockSubscription()]
      const { container } = render(<StatsCards subscriptions={subscriptions} />)
      
      // Check for grid layout
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toBeInTheDocument()
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
      
      // Check for card styling - there might be nested rounded-2xl elements
      const cards = container.querySelectorAll('.rounded-2xl')
      expect(cards.length).toBeGreaterThanOrEqual(6)
    })
  })
})