# Настройка AI Инсайтов в SubTracker

## Текущее состояние

🎉 **AI Инсайты полностью работают!**

AI инсайты успешно настроены и работают с **OpenAI o3 reasoning model** через Supabase Edge Function. Система автоматически переключается между реальным AI API и демо-режимом в зависимости от конфигурации.

## Демо-режим

В демо-режиме система генерирует персональный анализ подписок в дружелюбном формате:

- **Персональное приветствие** с анализом интересов пользователя
- **Похвала и рекомендации** по текущим подпискам
- **Оптимизация расходов** с конкретными суммами экономии
- **Выявление дубликатов** сервисов с похожей функциональностью
- **Новые рекомендации** - предложения интересных подписок
- **Практические советы** по управлению подписками

## Быстрое включение AI API

Для включения реального AI API выполните следующие шаги:

### 1. Настройте переменные окружения

Добавьте в ваш `.env` файл:

```env
# Включить AI API (любое значение включает)
VITE_AI_API_KEY=true

# URL вашей Supabase Edge Function
VITE_AI_API_ENDPOINT=https://your-project.supabase.co/functions/v1/ai-insights
```

Замените `your-project` на реальный ID вашего Supabase проекта.

### 2. Настройте OpenAI API ключ в Supabase

1. Перейдите в Supabase Dashboard
2. Откройте Settings > Secrets  
3. Добавьте новую переменную:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** ваш OpenAI API ключ

### 3. Перезапустите приложение

```bash
npm run dev
```

Теперь AI инсайты будут генерироваться с помощью **OpenAI o3 reasoning model**!

## Детальная настройка

### Шаг 1: Создание Supabase Edge Function ✅

✅ **Готово!** Edge Function уже создана в `supabase/functions/ai-insights/`

### Шаг 2: Реализация Edge Function ✅

✅ **Готово!** Edge Function уже реализована с интеграцией **OpenAI o3 reasoning model**

**Особенности реализации:**
- Использует модель `o3` с параметром `reasoning_effort: medium`
- Увеличенный лимит токенов `max_completion_tokens: 10000`
- **Новый текстовый формат анализа** - связный персональный анализ вместо отдельных инсайтов
- **Дружелюбный тон** - AI выступает как персональный финансовый консультант
- Умная обработка ответов с очисткой markdown и преобразованием формата
- Детальное логирование для отладки
- Автоматический fallback на демо-режим при ошибках

Код функции находится в файле `supabase/functions/ai-insights/index.ts`

### Шаг 3: Настройка переменных окружения

В Supabase Dashboard > Settings > Secrets добавьте:

```bash
# Для OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Для Claude
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Шаг 4: Деплой функции

```bash
supabase functions deploy ai-insights
```

### Шаг 5: Настройка клиента

Обновите файл `.env`:

```env
VITE_AI_API_KEY=true
VITE_AI_API_ENDPOINT=https://your-project.supabase.co/functions/v1/ai-insights
```

### Шаг 6: Обновление aiService.ts

Если требуется кастомизация, обновите файл `src/services/aiService.ts`:

```typescript
async generateInsights(request: GenerateInsightsRequest): Promise<GenerateInsightsResponse> {
  const hasApiKey = import.meta.env.VITE_AI_API_KEY;
  const apiEndpoint = import.meta.env.VITE_AI_API_ENDPOINT;
  
  if (!hasApiKey || !apiEndpoint) {
    return this.generateDemoInsights(request);
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating insights:', error);
    // Fallback to demo mode
    return this.generateDemoInsights(request);
  }
}
```

## Альтернативные варианты интеграции

### 1. Прямое подключение к OpenAI

Если не хотите использовать Supabase Edge Functions:

```typescript
// В src/services/aiService.ts
async generateInsights(request: GenerateInsightsRequest): Promise<GenerateInsightsResponse> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    return this.generateDemoInsights(request);
  }

  // ВНИМАНИЕ: Это небезопасно для продакшена!
  // API ключ будет виден в клиентском коде
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Ты финансовый аналитик...' },
        { role: 'user', content: this.generatePrompt(request.subscriptions) }
      ]
    })
  });

  // Обработка ответа...
}
```

### 2. Использование других бэкендов

- **Vercel Functions:** Создайте API route в `/api/ai-insights.js`
- **Netlify Functions:** Разместите функцию в `/.netlify/functions/`
- **Cloudflare Workers:** Используйте Workers AI

## Безопасность

⚠️ **ВАЖНО:** Никогда не храните API ключи в клиентском коде!

✅ **Правильно:**
- Используйте Supabase Edge Functions или другой серверный код
- Храните ключи в переменных окружения на сервере
- Используйте аутентификацию пользователей

❌ **Неправильно:**
- Хранить API ключи в `.env` файлах клиента
- Отправлять запросы к AI API напрямую из браузера

## Стоимость

Примерная стоимость запросов:

- **OpenAI o3 reasoning model:** ~$0.05-0.15 за анализ (включая reasoning токены)
- **OpenAI GPT-4:** ~$0.01-0.03 за анализ  
- **Claude Sonnet:** ~$0.003-0.015 за анализ

**Особенности o3 модели:**
- Reasoning токены не включены в response, но тарифицируются
- Более высокое качество анализа за счет "размышлений"
- Параметр `reasoning_effort` влияет на стоимость

Рекомендуется:
- Кэшировать результаты на 30-60 минут
- Ограничить количество запросов на пользователя (300 в день по лимитам OpenAI)
- Мониторить usage через OpenAI Dashboard

## Тестирование

После настройки проверьте:

1. Откройте вкладку "AI Инсайты"
2. Нажмите "Генерировать инсайты"
3. Убедитесь, что инсайты генерируются корректно
4. Проверьте логи в Supabase Functions (если используете Edge Functions)

## Поддержка

При возникновении проблем:

1. Проверьте логи в Supabase Dashboard > Functions
2. Убедитесь, что API ключи корректны
3. Проверьте лимиты API провайдера
4. Убедитесь, что пользователь аутентифицирован

## Дальнейшее развитие

Возможные улучшения:

- Персонализация рекомендаций на основе истории
- Интеграция с банковскими API для автоматического отслеживания
- Уведомления о новых инсайтах
- Экспорт отчетов с рекомендациями
- A/B тестирование различных AI моделей