import { useTokenRefresh } from '../hooks/useTokenRefresh'
import { Calendar, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

export function GoogleCalendarStatus() {
  const { tokenStatus, refreshToken } = useTokenRefresh()

  // Не показываем компонент если нет токена
  if (!tokenStatus.hasToken) {
    return null
  }

  // Показываем компонент только если есть проблемы или токен скоро истечет
  const shouldShow = tokenStatus.isExpired || 
    tokenStatus.expiresIn === null || 
    (tokenStatus.expiresIn !== null && tokenStatus.expiresIn < 300) // Показываем за 5 минут до истечения

  if (!shouldShow) {
    return null
  }

  const getStatusColor = () => {
    if (tokenStatus.isExpired) return 'text-red-500'
    if (tokenStatus.expiresIn && tokenStatus.expiresIn < 600) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getStatusText = () => {
    if (tokenStatus.isExpired) return 'Токен истек'
    if (tokenStatus.expiresIn === null) return 'Статус неизвестен'
    if (tokenStatus.expiresIn < 60) return `Истекает через ${tokenStatus.expiresIn} сек`
    if (tokenStatus.expiresIn < 600) return `Истекает через ${Math.floor(tokenStatus.expiresIn / 60)} мин`
    return 'Активен'
  }

  const needsAction = true // Всегда показываем кнопку обновления когда компонент видим

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs border">
      <div className="flex items-center gap-3">
        <Calendar className={cn('h-5 w-5', getStatusColor())} />
        <div className="flex-1">
          <p className="text-sm font-medium">Google Calendar</p>
          <p className={cn('text-xs', getStatusColor())}>{getStatusText()}</p>
        </div>
        {needsAction && (
          <Button
            size="sm"
            variant="outline"
            onClick={refreshToken}
            className="h-8 w-8 p-0"
            title="Обновить токен"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
      {tokenStatus.isExpired && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>Синхронизация с календарем приостановлена</span>
        </div>
      )}
    </div>
  )
}