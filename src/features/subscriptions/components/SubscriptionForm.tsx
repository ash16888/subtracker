import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { useState } from 'react'
import { useCreateSubscription, useUpdateSubscription } from '../hooks/useSubscriptions'
import { CATEGORIES } from '../../../types/subscription'
import { useGoogleCalendar } from '../../calendar/hooks/useGoogleCalendar'
import type { Database } from '../../../types/database.types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

const formSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Сумма должна быть положительным числом',
  }),
  currency: z.string().min(1, 'Валюта обязательна'),
  billing_period: z.enum(['monthly', 'yearly']),
  next_payment_date: z.string().min(1, 'Дата обязательна'),
  category: z.string().optional(),
  url: z.string().url('Неверный формат URL').optional().or(z.literal('')),
})

type FormData = z.infer<typeof formSchema>

interface SubscriptionFormProps {
  onClose: () => void
  subscription?: Subscription
}

export function SubscriptionForm({ onClose, subscription }: SubscriptionFormProps) {
  const createSubscription = useCreateSubscription()
  const updateSubscription = useUpdateSubscription()
  const isEditing = !!subscription
  const [addToCalendar, setAddToCalendar] = useState(false)
  const [calendarError, setCalendarError] = useState<string | null>(null)
  
  const {
    isLoaded: isCalendarLoaded,
    isSignedIn: isCalendarSignedIn,
    requestCalendarAccess,
    createSubscriptionReminder,
    updateSubscriptionReminder,
  } = useGoogleCalendar()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing ? {
      name: subscription.name,
      amount: subscription.amount.toString(),
      currency: subscription.currency,
      billing_period: subscription.billing_period,
      next_payment_date: format(new Date(subscription.next_payment_date), 'yyyy-MM-dd'),
      category: subscription.category || '',
      url: subscription.url || '',
    } : {
      currency: '₽',
      billing_period: 'monthly',
      next_payment_date: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      let calendarEventId: string | null = null;
      
      // Обработка Google Calendar
      if (addToCalendar && isCalendarLoaded && isCalendarSignedIn) {
        try {
          if (isEditing && subscription.google_calendar_event_id) {
            // Обновляем существующее событие
            calendarEventId = await updateSubscriptionReminder(
              subscription.google_calendar_event_id,
              data.name,
              Number(data.amount),
              data.currency,
              new Date(data.next_payment_date)
            );
          } else {
            // Создаем новое событие
            calendarEventId = await createSubscriptionReminder(
              data.name,
              Number(data.amount),
              data.currency,
              new Date(data.next_payment_date)
            );
          }
        } catch (calError) {
          console.error('Ошибка при работе с Google Calendar:', calError);
          setCalendarError('Не удалось добавить событие в календарь');
        }
      }
      
      if (isEditing) {
        await updateSubscription.mutateAsync({
          id: subscription.id,
          name: data.name,
          amount: Number(data.amount),
          currency: data.currency,
          billing_period: data.billing_period,
          next_payment_date: new Date(data.next_payment_date).toISOString(),
          category: data.category || null,
          url: data.url || null,
          google_calendar_event_id: calendarEventId || subscription.google_calendar_event_id || null,
        })
      } else {
        await createSubscription.mutateAsync({
          name: data.name,
          amount: Number(data.amount),
          currency: data.currency,
          billing_period: data.billing_period,
          next_payment_date: new Date(data.next_payment_date).toISOString(),
          category: data.category || null,
          url: data.url || null,
          google_calendar_event_id: calendarEventId,
        })
      }
      onClose()
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} subscription:`, error)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">{isEditing ? 'Редактирование подписки' : 'Новая подписка'}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <span className="sr-only">Закрыть</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Название сервиса
          </label>
          <input
            type="text"
            id="name"
            {...register('name')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Netflix, Spotify, etc."
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Сумма
            </label>
            <input
              type="number"
              step="0.01"
              id="amount"
              {...register('amount')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
              Валюта
            </label>
            <select
              id="currency"
              {...register('currency')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="₽">₽ RUB</option>
              <option value="$">$ USD</option>
              <option value="€">€ EUR</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="billing_period" className="block text-sm font-medium text-gray-700">
              Период оплаты
            </label>
            <select
              id="billing_period"
              {...register('billing_period')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="monthly">Ежемесячно</option>
              <option value="yearly">Ежегодно</option>
            </select>
          </div>

          <div>
            <label htmlFor="next_payment_date" className="block text-sm font-medium text-gray-700">
              Следующий платеж
            </label>
            <input
              type="date"
              id="next_payment_date"
              {...register('next_payment_date')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            {errors.next_payment_date && (
              <p className="mt-1 text-sm text-red-600">{errors.next_payment_date.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Категория
          </label>
          <select
            id="category"
            {...register('category')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Выберите категорию</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700">
            Ссылка на управление (необязательно)
          </label>
          <input
            type="url"
            id="url"
            {...register('url')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="https://..."
          />
          {errors.url && (
            <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="addToCalendar"
                checked={addToCalendar}
                onChange={(e) => setAddToCalendar(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="addToCalendar" className="ml-2 block text-sm text-gray-700">
                Добавить напоминание в Google Calendar (за 3 дня до платежа)
              </label>
            </div>
            {addToCalendar && !isCalendarSignedIn && isCalendarLoaded && (
              <button
                type="button"
                onClick={requestCalendarAccess}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Подключить календарь
              </button>
            )}
          </div>
          {calendarError && (
            <p className="mt-2 text-sm text-red-600">{calendarError}</p>
          )}
          {isEditing && subscription.google_calendar_event_id && (
            <p className="mt-2 text-sm text-gray-500">
              ✓ Напоминание уже добавлено в календарь
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isEditing ? updateSubscription.isPending : createSubscription.isPending}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isEditing 
              ? (updateSubscription.isPending ? 'Сохранение...' : 'Сохранить')
              : (createSubscription.isPending ? 'Добавление...' : 'Добавить')
            }
          </button>
        </div>
      </form>
    </div>
  )
}