import { addMonths, addYears, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import type { Database } from '../../types/database.types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

export function calculateMonthlyTotal(subscriptions: Subscription[]): number {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  return subscriptions.reduce((total, sub) => {
    const nextPaymentDate = new Date(sub.next_payment_date)
    
    // Check if payment falls within current month
    if (isWithinInterval(nextPaymentDate, { start: monthStart, end: monthEnd })) {
      if (sub.billing_period === 'monthly') {
        return total + Number(sub.amount)
      } else if (sub.billing_period === 'yearly') {
        // Convert yearly to monthly
        return total + Number(sub.amount) / 12
      }
    }
    
    return total
  }, 0)
}

export function calculateNextPaymentDate(
  currentDate: Date,
  billingPeriod: 'monthly' | 'yearly'
): Date {
  if (billingPeriod === 'monthly') {
    return addMonths(currentDate, 1)
  } else {
    return addYears(currentDate, 1)
  }
}

export function formatCurrency(amount: number, currency: string): string {
  const input = (currency || '').trim()

  // Map common currency symbols to ISO 4217 codes
  const symbolToCode: Record<string, string> = {
    '₽': 'RUB',
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₩': 'KRW',
    '₹': 'INR',
    '₺': 'TRY',
    '₴': 'UAH',
    '₫': 'VND',
    '₦': 'NGN',
    '₪': 'ILS',
    '₱': 'PHP',
    'R$': 'BRL',
    'C$': 'CAD',
    'CA$': 'CAD',
    'A$': 'AUD',
    'AU$': 'AUD',
  }

  // Resolve currency to a well-formed ISO code when possible
  let resolvedCode: string | null = null
  if (/^[A-Za-z]{3}$/.test(input)) {
    resolvedCode = input.toUpperCase()
  } else if (symbolToCode[input]) {
    resolvedCode = symbolToCode[input]
  }

  try {
    if (resolvedCode) {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: resolvedCode,
        // Prefer narrow symbols (e.g., $ instead of US$) when available
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount)
    }
  } catch {
    // fall through to fallback below
  }

  // Fallback: format number and append the original currency string literally
  const number = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${number} ${input}`.trim()
}
