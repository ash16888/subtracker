import React from 'react';
import { useAuth } from '../features/auth/useAuth';
import { useSubscriptions } from '../features/subscriptions/hooks/useSubscriptions';
import { useAIInsights } from '../features/ai-insights/hooks/useAIInsights';
import { GenerateInsightsButton } from '../features/ai-insights/components/GenerateInsightsButton';
import { InsightsList } from '../features/ai-insights/components/InsightsList';
import type { Subscription } from '../types/subscription';

export const AIInsightsPage: React.FC = () => {
  const { user } = useAuth();
  const { data: subscriptions = [], isLoading: isLoadingSubscriptions } = useSubscriptions();
  const { 
    insights, 
    isLoadingInsights, 
    generateInsights, 
    isGenerating,
    generateError,
    clearInsights
  } = useAIInsights();

  const handleGenerateInsights = () => {
    if (!user || !subscriptions.length) return;

    const request = {
      userId: user.id,
      subscriptions: subscriptions
        .filter((sub: Subscription) => sub.id) // Filter out any subscriptions without IDs
        .map((sub: Subscription) => ({
          id: sub.id!,
          name: sub.name,
          amount: sub.amount,
          currency: sub.currency,
          billing_period: sub.billing_period,
          next_payment_date: sub.next_payment_date,
          category: sub.category || undefined,
          url: sub.url || undefined
        }))
    };

    generateInsights(request);
  };

  const canGenerateInsights = !isLoadingSubscriptions && subscriptions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Инсайты</h1>
          <p className="mt-1 text-sm text-gray-600">
            Получите персонализированные рекомендации по оптимизации ваших подписок
          </p>
        </div>
        <div className="flex gap-2">
          {insights.length > 0 && (
            <button
              onClick={clearInsights}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Очистить
            </button>
          )}
          <GenerateInsightsButton
            onClick={handleGenerateInsights}
            isLoading={isGenerating}
            disabled={!canGenerateInsights}
          />
        </div>
      </div>

      {generateError && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Ошибка генерации инсайтов
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {generateError instanceof Error ? generateError.message : 'Произошла неизвестная ошибка'}
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoadingSubscriptions ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загружаем ваши подписки...</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Добавьте подписки, чтобы получить персонализированные инсайты
          </p>
        </div>
      ) : (
        <InsightsList 
          insights={insights} 
          isLoading={isGenerating || isLoadingInsights}
        />
      )}
    </div>
  );
};