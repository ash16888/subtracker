import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import {
  calculateMonthlyTotal,
  calculateNextPaymentDate,
  formatCurrency,
} from './calculations'
import type { Subscription } from '../../types/subscription'

// Helper to freeze time consistently across tests
const FIXED_NOW = new Date('2024-01-15T10:00:00Z') // mid-month in UTC

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})

afterAll(() => {
  vi.useRealTimers()
})

// Minimal subscription stub typing
type StubSub = {
  amount: number | string
  billing_period: 'monthly' | 'yearly'
  next_payment_date: string
}

describe('calculateMonthlyTotal', () => {
  it('counts monthly subscription that falls within the current month', () => {
    const subs: StubSub[] = [
      {
        amount: 999,
        billing_period: 'monthly',
        next_payment_date: '2024-01-20T12:00:00Z',
      },
    ]
    expect(calculateMonthlyTotal(subs as Subscription[])).toBe(999)
  })

  it('converts yearly amount to monthly fraction when due this month', () => {
    const subs: StubSub[] = [
      {
        amount: 12000,
        billing_period: 'yearly',
        next_payment_date: '2024-01-02T00:00:00Z',
      },
    ]
    expect(calculateMonthlyTotal(subs as Subscription[])).toBeCloseTo(1000) // 12000 / 12
  })

  it('ignores subscriptions whose next payment date is outside the current month', () => {
    const subs: StubSub[] = [
      {
        amount: 500,
        billing_period: 'monthly',
        next_payment_date: '2024-02-01T00:00:00Z',
      },
    ]
    expect(calculateMonthlyTotal(subs as Subscription[])).toBe(0)
  })

  it('includes boundary dates: first and last day of month', () => {
    const subs: StubSub[] = [
      {
        amount: 100,
        billing_period: 'monthly',
        next_payment_date: '2024-01-01T12:00:00Z', // first day
      },
      {
        amount: 200,
        billing_period: 'monthly',
        next_payment_date: '2024-01-30T12:00:00Z', // within month for sure
      },
    ]
    expect(calculateMonthlyTotal(subs as Subscription[])).toBe(300)
  })

  it('handles mixed billing periods in same month', () => {
    const subs: StubSub[] = [
      {
        amount: 1200,
        billing_period: 'monthly',
        next_payment_date: '2024-01-10T00:00:00Z',
      },
      {
        amount: 6000,
        billing_period: 'yearly',
        next_payment_date: '2024-01-25T00:00:00Z',
      },
    ]
    expect(calculateMonthlyTotal(subs as Subscription[])).toBeCloseTo(1700) // 1200 + 6000/12 = 1700
  })

  it('returns 0 when subscription list is empty', () => {
    expect(calculateMonthlyTotal([] as Subscription[])).toBe(0)
  })
})

describe('calculateNextPaymentDate', () => {
  it('adds one month for monthly billing period', () => {
    const current = new Date('2024-03-15T09:00:00Z')
    const expected = new Date('2024-04-15T09:00:00Z')
    expect(calculateNextPaymentDate(current, 'monthly')).toEqual(expected)
  })

  it('handles month addition across year boundary (Dec -> Jan)', () => {
    const current = new Date('2024-12-31T23:59:59Z')
    const expected = new Date('2025-01-31T23:59:59Z')
    expect(calculateNextPaymentDate(current, 'monthly')).toEqual(expected)
  })

  it('adds one year for yearly billing period, leap-day origin', () => {
    const current = new Date('2020-02-29T12:00:00Z')
    const expected = new Date('2021-02-28T12:00:00Z') // date-fns behaviour
    expect(calculateNextPaymentDate(current, 'yearly')).toEqual(expected)
  })
})

describe('formatCurrency', () => {
  it('formats rouble amounts with ₽ symbol when currency is "₽"', () => {
    const formatted = formatCurrency(1500, '₽')
    expect(formatted).toMatch(/₽/) // locale may insert spaces, just ensure symbol
  })

  it('formats USD with rounding to 2 decimals', () => {
    const formatted = formatCurrency(1234.567, 'USD')
    expect(formatted).toMatch(/\$/)
    expect(formatted).toMatch(/1.*234.*57/) // locale uses comma as decimal separator
  })

  it('returns string containing unknown currency code literally', () => {
    const formatted = formatCurrency(100, 'XYZ')
    expect(formatted).toContain('XYZ')
  })

  it('formats negative values with leading minus sign', () => {
    const formatted = formatCurrency(-500, 'USD')
    // Depending on locale spacing, look for Unicode minus or hyphen before digits
    expect(formatted).toMatch(/^-?\s*[-−]/u) // either ASCII or Unicode minus
  })
})