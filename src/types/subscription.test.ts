import { subscriptionSchema, subscriptionFormSchema } from './subscription'

describe('Subscription validation behavior', () => {
  describe('subscriptionSchema', () => {
    it('should validate a complete subscription', () => {
      const validSubscription = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Netflix',
        amount: 999,
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15T10:00:00Z',
        category: 'Развлечения',
        url: 'https://netflix.com',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        google_calendar_event_id: 'cal_event_123',
      }

      const result = subscriptionSchema.safeParse(validSubscription)
      expect(result.success).toBe(true)
    })

    it('should validate subscription with minimal required fields', () => {
      const minimalSubscription = {
        name: 'Spotify',
        amount: 299,
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15T10:00:00Z',
      }

      const result = subscriptionSchema.safeParse(minimalSubscription)
      expect(result.success).toBe(true)
    })

    it('should reject subscription with negative amount', () => {
      const invalidSubscription = {
        name: 'Service',
        amount: -100,
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15T10:00:00Z',
      }

      const result = subscriptionSchema.safeParse(invalidSubscription)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors).toContainEqual(
          expect.objectContaining({
            path: ['amount'],
            message: 'Amount must be positive',
          })
        )
      }
    })

    it('should reject subscription with empty name', () => {
      const invalidSubscription = {
        name: '',
        amount: 999,
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15T10:00:00Z',
      }

      const result = subscriptionSchema.safeParse(invalidSubscription)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors).toContainEqual(
          expect.objectContaining({
            path: ['name'],
            message: 'Name is required',
          })
        )
      }
    })

    it('should reject subscription with invalid billing period', () => {
      const invalidSubscription = {
        name: 'Service',
        amount: 999,
        currency: '₽',
        billing_period: 'daily',
        next_payment_date: '2024-01-15T10:00:00Z',
      }

      const result = subscriptionSchema.safeParse(invalidSubscription)
      expect(result.success).toBe(false)
    })

    it('should allow null category and url', () => {
      const subscriptionWithNulls = {
        name: 'Service',
        amount: 999,
        currency: '₽',
        billing_period: 'yearly' as const,
        next_payment_date: '2024-01-15T10:00:00Z',
        category: null,
        url: null,
      }

      const result = subscriptionSchema.safeParse(subscriptionWithNulls)
      expect(result.success).toBe(true)
    })

    it('should validate HTTPS URLs', () => {
      const subscriptionWithUrl = {
        name: 'Service',
        amount: 999,
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15T10:00:00Z',
        url: 'https://example.com',
      }

      const result = subscriptionSchema.safeParse(subscriptionWithUrl)
      expect(result.success).toBe(true)
    })

    it('should reject non-HTTP(S) URLs', () => {
      const subscriptionWithInvalidUrl = {
        name: 'Service',
        amount: 999,
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15T10:00:00Z',
        url: 'ftp://example.com',
      }

      const result = subscriptionSchema.safeParse(subscriptionWithInvalidUrl)
      expect(result.success).toBe(false)
    })
  })

  describe('subscriptionFormSchema', () => {
    it('should validate form data with string amount', () => {
      const formData = {
        name: 'Netflix',
        amount: '999',
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15',
        category: 'Развлечения',
        url: 'https://netflix.com',
      }

      const result = subscriptionFormSchema.safeParse(formData)
      expect(result.success).toBe(true)
    })

    it('should reject form with non-numeric amount', () => {
      const formData = {
        name: 'Service',
        amount: 'invalid',
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15',
      }

      const result = subscriptionFormSchema.safeParse(formData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors).toContainEqual(
          expect.objectContaining({
            path: ['amount'],
            message: 'Сумма должна быть положительным числом',
          })
        )
      }
    })

    it('should reject form with negative amount string', () => {
      const formData = {
        name: 'Service',
        amount: '-100',
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15',
      }

      const result = subscriptionFormSchema.safeParse(formData)
      expect(result.success).toBe(false)
    })

    it('should allow empty URL in form', () => {
      const formData = {
        name: 'Service',
        amount: '999',
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15',
        url: '',
      }

      const result = subscriptionFormSchema.safeParse(formData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid URL format in form', () => {
      const formData = {
        name: 'Service',
        amount: '999',
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15',
        url: 'not-a-url',
      }

      const result = subscriptionFormSchema.safeParse(formData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors).toContainEqual(
          expect.objectContaining({
            path: ['url'],
            message: 'Неверный формат URL',
          })
        )
      }
    })

    it('should require name in form', () => {
      const formData = {
        name: '',
        amount: '999',
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15',
      }

      const result = subscriptionFormSchema.safeParse(formData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors).toContainEqual(
          expect.objectContaining({
            path: ['name'],
            message: 'Название обязательно',
          })
        )
      }
    })

    it('should require currency in form', () => {
      const formData = {
        name: 'Service',
        amount: '999',
        currency: '',
        billing_period: 'monthly' as const,
        next_payment_date: '2024-01-15',
      }

      const result = subscriptionFormSchema.safeParse(formData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors).toContainEqual(
          expect.objectContaining({
            path: ['currency'],
            message: 'Валюта обязательна',
          })
        )
      }
    })

    it('should require next payment date in form', () => {
      const formData = {
        name: 'Service',
        amount: '999',
        currency: '₽',
        billing_period: 'monthly' as const,
        next_payment_date: '',
      }

      const result = subscriptionFormSchema.safeParse(formData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors).toContainEqual(
          expect.objectContaining({
            path: ['next_payment_date'],
            message: 'Дата обязательна',
          })
        )
      }
    })
  })
})