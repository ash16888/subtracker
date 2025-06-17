import { z } from 'zod'

export const subscriptionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  billing_period: z.enum(['monthly', 'yearly']),
  next_payment_date: z.string().datetime(),
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
})

export type Subscription = z.infer<typeof subscriptionSchema>

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