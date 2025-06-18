import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { demoSubscriptions, demoUser } from '../data/demoSubscriptions';
import { useAIInsights } from '../features/ai-insights/hooks/useAIInsights';
import { GenerateInsightsButton } from '../features/ai-insights/components/GenerateInsightsButton';
import { InsightsList } from '../features/ai-insights/components/InsightsList';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export const DemoAIInsightsPage: React.FC = () => {
  const [hasGenerated, setHasGenerated] = useState(false);
  const { 
    insights, 
    generateInsights, 
    isGenerating,
    generateError,
    clearInsights
  } = useAIInsights();

  const handleGenerateInsights = () => {
    const request = {
      userId: demoUser.id,
      subscriptions: demoSubscriptions
    };

    generateInsights(request);
    setHasGenerated(true);
  };

  const handleClearInsights = () => {
    clearInsights();
    setHasGenerated(false);
  };

  // Расчет общей стоимости для отображения
  const totalMonthly = demoSubscriptions.reduce((sum, sub) => {
    const monthlyAmount = sub.billing_period === 'yearly' ? sub.amount / 12 : sub.amount;
    return sum + monthlyAmount;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Войти</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">SubTracker - Демо AI Инсайтов</h1>
            </div>
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
              Демо-режим
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Intro */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white mb-8">
          <h2 className="text-2xl font-bold mb-2">Демонстрация AI Инсайтов</h2>
          <p className="text-blue-100 mb-4">
            Посмотрите, как AI анализирует подписки и дает рекомендации по оптимизации расходов
          </p>
          <div className="bg-white/10 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Тестовые подписки ({demoSubscriptions.length}):</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {demoSubscriptions.map(sub => (
                <div key={sub.id} className="bg-white/10 rounded px-2 py-1">
                  {sub.name}: {sub.amount} {sub.currency}/{sub.billing_period === 'monthly' ? 'мес' : 'год'}
                </div>
              ))}
            </div>
            <div className="mt-3 text-lg font-semibold">
              Общая стоимость: ~{Math.round(totalMonthly)} ₽/месяц
            </div>
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Инсайты</h2>
              <p className="mt-1 text-sm text-gray-600">
                Персонализированные рекомендации по оптимизации подписок
              </p>
            </div>
            <div className="flex gap-2">
              {insights.length > 0 && (
                <button
                  onClick={handleClearInsights}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Очистить
                </button>
              )}
              <GenerateInsightsButton
                onClick={handleGenerateInsights}
                isLoading={isGenerating}
                disabled={false}
              />
            </div>
          </div>

          {generateError && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
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

          {!hasGenerated && insights.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Нажмите "Генерировать инсайты"
              </h3>
              <p className="text-gray-500 mb-4">
                AI проанализирует тестовые подписки и предложит рекомендации по оптимизации
              </p>
            </div>
          ) : (
            <InsightsList 
              insights={insights} 
              isLoading={isGenerating}
            />
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-8 bg-gray-900 rounded-xl p-6 text-center">
          <h3 className="text-xl font-bold text-white mb-2">
            Понравилась функциональность?
          </h3>
          <p className="text-gray-300 mb-4">
            Зарегистрируйтесь, чтобы анализировать ваши реальные подписки
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white transition-colors"
          >
            Начать использовать SubTracker
          </Link>
        </div>
      </div>
    </div>
  );
};