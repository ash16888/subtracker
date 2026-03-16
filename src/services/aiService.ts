import type { GenerateInsightsRequest, GenerateInsightsResponse, AIInsight } from '../features/ai-insights/types/insights';
import type { Subscription } from '../types/subscription';
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
      const sessionResult = await supabase.auth.getSession();
      const session = sessionResult?.data?.session;
      
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
    } catch (error: unknown) {
      console.error('Error generating insights:', error);
      // Fallback на демо-режим при ошибке
      console.warn('Falling back to demo mode due to error');
      return this.generateDemoInsights(request);
    }
  }

  private generateDemoInsights(request: GenerateInsightsRequest): GenerateInsightsResponse {
    const { subscriptions } = request;

    const totalMonthlySpend = subscriptions.reduce((sum, sub) => {
      const monthlyAmount = sub.billing_period === 'yearly' ? sub.amount / 12 : sub.amount;
      return sum + monthlyAmount;
    }, 0);

    const monthlySubscriptions = subscriptions.filter(s => s.billing_period === 'monthly');
    const categories = [...new Set(subscriptions.map(sub => sub.category).filter(Boolean))] as string[];
    const subscriptionNames = subscriptions.map(sub => sub.name).filter(Boolean);

    // Вычисляем потенциальную экономию
    const potentialSavings = monthlySubscriptions.reduce((sum, sub) => {
      return sum + (sub.amount * 12 * 0.15) / 12; // 15% скидка при переходе на годовой план
    }, 0);

    // Генерируем персональный анализ в стиле нового формата
    const analysis = this.generatePersonalizedAnalysis(
      subscriptions,
      subscriptionNames,
      categories,
      totalMonthlySpend,
      monthlySubscriptions.length,
      Math.round(potentialSavings)
    );

    const insight: AIInsight = {
      id: `ai-analysis-${Date.now()}`,
      type: 'analysis',
      priority: 'high',
      title: '📊 Персональный анализ ваших подписок',
      description: analysis,
      actionItems: [
        'Рассмотрите переход на годовые тарифы',
        'Проведите аудит неиспользуемых сервисов',
        'Изучите новые рекомендованные подписки'
      ],
      potentialSavings: Math.round(potentialSavings),
      affectedSubscriptions: [],
      createdAt: new Date()
    };

    return {
      insights: [insight],
      generatedAt: new Date()
    };
  }

  private generatePersonalizedAnalysis(
    subscriptions: Subscription[],
    names: string[],
    categories: string[],
    totalMonthly: number,
    monthlyCount: number,
    savings: number
  ): string {
    const hasNetflix = names.some(n => n.toLowerCase().includes('netflix'));
    const hasSpotify = names.some(n => n.toLowerCase().includes('spotify'));
    const hasYouTube = names.some(n => n.toLowerCase().includes('youtube'));
    const hasGaming = categories.includes('Игры');
    const hasWork = categories.includes('Работа');
    
    let analysis = '';

    // Приветствие и анализ интересов
    analysis += `🎯 Отличный выбор подписок! Вижу, что у вас разносторонние интересы `;
    
    if (hasNetflix && hasSpotify) {
      analysis += `— вы цените качественные развлечения с Netflix и музыку со Spotify. `;
    } else if (hasYouTube) {
      analysis += `— YouTube Premium показывает, что вы активно потребляете видеоконтент. `;
    }
    
    if (hasGaming) {
      analysis += `Подписки на игровые сервисы говорят о том, что игры — важная часть вашего досуга. `;
    }
    
    if (hasWork) {
      analysis += `Рабочие инструменты в списке показывают профессиональный подход к задачам. `;
    }

    analysis += `\n\n💰 Сейчас ваши подписки обходятся в ${Math.round(totalMonthly)} ₽ в месяц. `;
    
    if (totalMonthly < 2000) {
      analysis += `Это весьма разумная сумма! Вы умеете контролировать расходы. `;
    } else if (totalMonthly < 5000) {
      analysis += `Это средний уровень трат на подписки — вполне нормально для активного пользователя. `;
    } else {
      analysis += `Это довольно высокая сумма, но если вы активно пользуетесь всеми сервисами — то это оправдано. `;
    }

    // Основной анализ и рекомендации
    if (monthlyCount > 0) {
      analysis += `\n\n🔄 У вас ${monthlyCount} подписок с месячной оплатой. Хорошая новость — многие сервисы предлагают скидки за годовую предоплату! `;
      analysis += `Если перейти на годовые планы, можно сэкономить около ${savings} ₽ в месяц. `;
      analysis += `Конечно, стоит это делать только для тех сервисов, которыми вы пользуетесь регулярно. `;
    }

    analysis += `\n\n🔍 Заметил несколько моментов для размышления:\n`;
    
    if (hasNetflix && hasYouTube) {
      analysis += `• У вас есть и Netflix, и YouTube Premium — это отличное сочетание для разнообразного контента\n`;
    }
    
    if (categories.length > 3) {
      analysis += `• Ваши подписки охватывают ${categories.length} категорий — это показывает широкий спектр интересов\n`;
    }
    
    if (subscriptions.length > 5) {
      analysis += `• ${subscriptions.length} активных подписок — довольно много, стоит периодически проверять, всеми ли вы пользуетесь\n`;
    }

    // Персональные рекомендации
    analysis += `\n\n✨ Возможно, вам были бы интересны:\n`;
    
    if (!hasSpotify && hasYouTube) {
      analysis += `• **Spotify Premium** — отличное дополнение к YouTube для музыки без рекламы\n`;
    }
    
    if (hasWork && !names.some(n => n.toLowerCase().includes('notion'))) {
      analysis += `• **Notion** — мощный инструмент для организации работы и заметок\n`;
    }
    
    if (hasGaming && !names.some(n => n.toLowerCase().includes('discord'))) {
      analysis += `• **Discord Nitro** — для улучшенного общения с друзьями по играм\n`;
    }
    
    if (!hasWork && !hasGaming && totalMonthly < 3000) {
      analysis += `• **Adobe Creative Cloud** — если интересует дизайн или фото\n`;
      analysis += `• **Skillbox или GeekBrains** — для изучения новых навыков\n`;
    }

    analysis += `\n🎯 В целом, у вас хорошо сбалансированный набор подписок. Главное — периодически пересматривать список и отменять то, чем не пользуетесь. Удачного управления подписками!`;

    return analysis;
  }
}

export const aiService = AIService.getInstance();