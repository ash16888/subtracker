import React, { useState } from 'react';
import type { AIInsight, InsightType } from '../types/insights';
import { InsightCard } from './InsightCard';

interface InsightsListProps {
  insights: AIInsight[];
  isLoading?: boolean;
}

const insightTypeLabels: Record<InsightType, string> = {
  optimization: 'Оптимизация',
  duplicate: 'Дубликаты',
  warning: 'Предупреждения',
  trend: 'Тренды',
  forecast: 'Прогнозы',
  category: 'Категории'
};

export const InsightsList: React.FC<InsightsListProps> = ({ insights, isLoading }) => {
  const [selectedType, setSelectedType] = useState<InsightType | 'all'>('all');

  const filteredInsights = selectedType === 'all' 
    ? insights 
    : insights.filter(insight => insight.type === selectedType);

  const insightTypes = Array.from(new Set(insights.map(i => i.type)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Анализируем ваши подписки...</p>
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          Нажмите кнопку "Генерировать инсайты", чтобы получить рекомендации по оптимизации подписок
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            selectedType === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Все ({insights.length})
        </button>
        {insightTypes.map(type => {
          const count = insights.filter(i => i.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedType === type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {insightTypeLabels[type]} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filteredInsights.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Нет инсайтов в выбранной категории
          </p>
        ) : (
          filteredInsights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </div>
    </div>
  );
};