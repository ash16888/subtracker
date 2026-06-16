import { z } from 'zod'

export const subscriptionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  billing_period: z.enum(['monthly', 'yearly']),
  next_payment_date: z.string().datetime(),
  status: z.enum(['active', 'trial', 'paused', 'canceled', 'archived']).default('active'),
  category: z.string().nullable().optional(),
  url: z.string()
    .refine((val) => {
      if (!val) return true
      try {
        const url = new URL(val)
        return ['http:', 'https:'].includes(url.protocol)
      } catch {
        return false
      }
    }, 'Only HTTP and HTTPS URLs are allowed')
    .nullable()
    .optional(),
  user_id: z.string().uuid().optional(),
  google_calendar_event_id: z.string().nullable().optional(),
  calendar_sync_status: z.enum(['not_connected', 'pending', 'synced', 'error', 'disabled']).default('not_connected'),
  calendar_sync_error: z.string().nullable().optional(),
  calendar_sync_attempted_at: z.string().datetime().nullable().optional(),
})

export const subscriptionFormSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Сумма должна быть положительным числом',
  }),
  currency: z.string().min(1, 'Валюта обязательна'),
  billing_period: z.enum(['monthly', 'yearly']),
  next_payment_date: z.string().min(1, 'Дата обязательна'),
  status: z.enum(['active', 'trial', 'paused', 'canceled', 'archived']),
  sync_google_calendar: z.boolean(),
  category: z.string().optional(),
  url: z.string().url('Неверный формат URL').optional().or(z.literal('')),
})

export type Subscription = z.infer<typeof subscriptionSchema>
export type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>

export const CATEGORIES = [
  'Мультисервис',
  'Развлечения',
  'Работа',
  'ИИ',
  'Игры',
  'Связь',
  'Другое',
] as const

export type Category = (typeof CATEGORIES)[number]

export const SUBSCRIPTION_STATUSES = [
  { value: 'active', label: 'Активна' },
  { value: 'trial', label: 'Пробный период' },
  { value: 'paused', label: 'Приостановлена' },
  { value: 'canceled', label: 'Отменена' },
  { value: 'archived', label: 'Архив' },
] as const
