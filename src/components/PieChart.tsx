import { useMemo } from 'react'
import type { Database } from '../types/database.types'
import { formatCurrency } from '../lib/utils/calculations'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

interface PieChartProps {
  subscriptions: Subscription[]
}

const CATEGORY_COLORS: Record<string, string> = {
  'Мультисервис': '#ef4444',
  'Развлечения': '#f59e0b', 
  'Работа': '#3b82f6',
  'ИИ': '#10b981',
  'Игры': '#ec4899',
  'Связь': '#8b5cf6',
  'Другое': '#6b7280'
}

export function PieChart({ subscriptions }: PieChartProps) {
  const { categoryData, totalAmount } = useMemo(() => {
    const categoryStats: Record<string, { amount: number; count: number }> = {}
    
    subscriptions.forEach(sub => {
      const category = sub.category || 'Другое'
      if (!categoryStats[category]) {
        categoryStats[category] = { amount: 0, count: 0 }
      }
      categoryStats[category].amount += Number(sub.amount)
      categoryStats[category].count += 1
    })

    const totalAmount = subscriptions.reduce((sum, sub) => sum + Number(sub.amount), 0)
    
    const categoryData = Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        amount: stats.amount,
        count: stats.count,
        percentage: (stats.amount / totalAmount) * 100,
        color: CATEGORY_COLORS[category] || CATEGORY_COLORS['Другое']
      }))
      .sort((a, b) => b.amount - a.amount)

    return { categoryData, totalAmount }
  }, [subscriptions])

  // Создаём SVG круговую диаграмму
  const createArcPath = (centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle)
    const end = polarToCartesian(centerX, centerY, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
    
    return [
      "M", centerX, centerY,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ")
  }

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    }
  }

  if (subscriptions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Распределение расходов</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Нет данных для отображения
        </div>
      </div>
    )
  }

  let currentAngle = 0
  const radius = 80
  const centerX = 100
  const centerY = 100

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Круговая диаграмма расходов</h3>
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width="200" height="200" className="transform -rotate-90">
            {categoryData.map((category) => {
              const sliceAngle = (category.percentage / 100) * 360
              const path = createArcPath(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
              currentAngle += sliceAngle
              
              return (
                <path
                  key={category.category}
                  d={path}
                  fill={category.color}
                  stroke="white"
                  strokeWidth="2"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              )
            })}
          </svg>
          
          {/* Центральный текст */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(totalAmount, '₽')}
              </div>
              <div className="text-sm text-gray-500">Всего</div>
            </div>
          </div>
        </div>
        
        {/* Легенда */}
        <div className="ml-8 space-y-2">
          {categoryData.map((category) => (
            <div key={category.category} className="flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: category.color }}
              />
              <div className="text-sm">
                <div className="font-medium text-gray-900">{category.category}</div>
                <div className="text-gray-500">
                  {formatCurrency(category.amount, '₽')} ({category.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}