import type { GenerateInsightsRequest, GenerateInsightsResponse, AIInsight } from '../features/ai-insights/types/insights';
import { supabase } from '../lib/supabase';

export class AIService {
  private static instance: AIService;

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateInsights(request: GenerateInsightsRequest): Promise<GenerateInsightsResponse> {
    const hasApiKey = import.meta.env.VITE_AI_API_KEY;
    const apiEndpoint = import.meta.env.VITE_AI_API_ENDPOINT;
    
    // Используем демо-режим, если нет настроек AI API
    if (!hasApiKey || !apiEndpoint) {
      return this.generateDemoInsights(request);
    }

    try {
      // Получаем текущую сессию пользователя
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('No active session, falling back to demo mode');
        return this.generateDemoInsights(request);
      }

      // Вызываем Supabase Edge Function
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptions: request.subscriptions,
          userId: session.user.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('AI API error:', response.status, errorData);
        throw new Error(`AI API error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error generating insights:', error);
      // Fallback на демо-режим при ошибке
      console.warn('Falling back to demo mode due to error');
      return this.generateDemoInsights(request);
    }
  }

  private generateDemoInsights(request: GenerateInsightsRequest): GenerateInsightsResponse {
    const { subscriptions } = request;
    const insights: AIInsight[] = [];

    const totalMonthlySpend = subscriptions.reduce((sum, sub) => {
      const monthlyAmount = sub.billing_period === 'yearly' ? sub.amount / 12 : sub.amount;
      return sum + monthlyAmount;
    }, 0);

    const avgSubscriptionCost = totalMonthlySpend / subscriptions.length;

    const monthlySubscriptions = subscriptions.filter(s => s.billing_period === 'monthly');

    if (monthlySubscriptions.length > 0) {
      const potentialSavings = monthlySubscriptions.reduce((sum, sub) => {
        const yearlyDiscount = sub.amount * 12 * 0.15;
        return sum + yearlyDiscount;
      }, 0);

      insights.push({
        id: 'opt-1',
        type: 'optimization',
        priority: 'high',
        title: 'Переход на годовые тарифы',
        description: `У вас ${monthlySubscriptions.length} подписок с месячной оплатой. Переход на годовые тарифы может сэкономить до 15% в год.`,
        actionItems: [
          'Проверьте возможность перехода на годовые тарифы',
          'Сравните цены месячных и годовых планов',
          'Рассмотрите переход для наиболее используемых сервисов'
        ],
        potentialSavings: Math.round(potentialSavings / 12),
        affectedSubscriptions: monthlySubscriptions.map(s => s.name),
        createdAt: new Date()
      });
    }

    const categoryGroups = subscriptions.reduce((acc, sub) => {
      const category = sub.category || 'Другое';
      if (!acc[category]) acc[category] = [];
      acc[category].push(sub);
      return acc;
    }, {} as Record<string, typeof subscriptions>);

    Object.entries(categoryGroups).forEach(([category, subs]) => {
      if (subs.length > 2) {
        insights.push({
          id: `cat-${category}`,
          type: 'category',
          priority: 'medium',
          title: `Много подписок в категории "${category}"`,
          description: `У вас ${subs.length} подписок в категории "${category}". Возможно, некоторые сервисы дублируют функциональность.`,
          actionItems: [
            'Проанализируйте, какие функции вы используете в каждом сервисе',
            'Рассмотрите возможность объединения функций в одном сервисе'
          ],
          affectedSubscriptions: subs.map(s => s.name),
          createdAt: new Date()
        });
      }
    });

    const expensiveSubscriptions = subscriptions.filter(sub => {
      const monthlyAmount = sub.billing_period === 'yearly' ? sub.amount / 12 : sub.amount;
      return monthlyAmount > avgSubscriptionCost * 1.5;
    });

    if (expensiveSubscriptions.length > 0) {
      insights.push({
        id: 'warn-1',
        type: 'warning',
        priority: 'medium',
        title: 'Дорогие подписки',
        description: `${expensiveSubscriptions.length} подписок стоят значительно больше среднего. Убедитесь, что вы получаете соответствующую ценность.`,
        actionItems: [
          'Оцените, насколько активно вы используете эти сервисы',
          'Рассмотрите возможность перехода на более дешевые планы',
          'Проверьте, есть ли альтернативы с лучшим соотношением цена/качество'
        ],
        affectedSubscriptions: expensiveSubscriptions.map(s => s.name),
        createdAt: new Date()
      });
    }

    const nextMonthForecast = totalMonthlySpend * 1.02;
    insights.push({
      id: 'forecast-1',
      type: 'forecast',
      priority: 'low',
      title: 'Прогноз расходов на следующий месяц',
      description: `Ожидаемые расходы на подписки в следующем месяце: ${Math.round(nextMonthForecast)} ₽`,
      actionItems: [
        'Подготовьте бюджет с учетом всех подписок',
        'Проверьте даты списаний, чтобы избежать нехватки средств'
      ],
      createdAt: new Date()
    });

    if (totalMonthlySpend > 5000) {
      insights.push({
        id: 'trend-1',
        type: 'trend',
        priority: 'high',
        title: 'Высокие общие расходы на подписки',
        description: `Ваши месячные расходы на подписки составляют ${Math.round(totalMonthlySpend)} ₽. Это довольно высокая сумма.`,
        actionItems: [
          'Проведите аудит всех подписок',
          'Отмените неиспользуемые сервисы',
          'Рассмотрите возможность использования семейных планов'
        ],
        createdAt: new Date()
      });
    }

    return {
      insights: insights.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      generatedAt: new Date()
    };
  }
}

export const aiService = AIService.getInstance();