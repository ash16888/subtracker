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
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency === '₽' ? 'RUB' : currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}