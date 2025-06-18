# Деплой SubTracker на Vercel

## 📋 Чек-лист для деплоя с AI инсайтами

### 1. ⚙️ Настройка переменных окружения в Vercel

Перейдите в **Vercel Dashboard** → ваш проект → **Settings** → **Environment Variables**

Добавьте следующие переменные для **Production**, **Preview** и **Development**:

#### Обязательные переменные:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

#### Для AI инсайтов (опционально):
```
VITE_AI_API_KEY=true
VITE_AI_API_ENDPOINT=https://your-project.supabase.co/functions/v1/ai-insights
```

### 2. 🔑 Настройка AI API в Supabase (если включаете AI)

1. Перейдите в **Supabase Dashboard** → **Settings** → **Secrets**
2. Добавьте новую переменную:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** ваш OpenAI API ключ

### 3. 🔐 Настройка Google OAuth

#### В Google Cloud Console:
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. **APIs & Services** → **Credentials**
4. Найдите ваш OAuth 2.0 Client ID
5. Добавьте в **Authorized JavaScript origins**:
   ```
   https://your-app.vercel.app
   ```
6. Добавьте в **Authorized redirect URIs**:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```

#### В Supabase Dashboard:
1. **Authentication** → **Settings**
2. **Site URL:** `https://your-app.vercel.app`
3. **Redirect URLs:** 
   ```
   https://your-app.vercel.app/**
   https://your-app.vercel.app
   ```
4. **Auth Providers** → **Google**
   - Обновите Client ID и Client Secret

### 4. 🚀 Деплой

#### Через Git (рекомендуется):
1. Закоммитьте изменения:
   ```bash
   git add .
   git commit -m "Configure AI insights with Supabase Edge Function"
   git push origin main
   ```
2. Vercel автоматически создаст новый деплой

#### Через Vercel CLI:
```bash
npm run build
vercel --prod
```

### 5. ✅ Проверка после деплоя

1. **Откройте ваше приложение**
2. **Войдите через Google** - проверьте аутентификацию
3. **Перейдите на вкладку "AI Инсайты"**
4. **Нажмите "Генерировать инсайты"**

#### Ожидаемое поведение:
- **Без AI API:** демо-режим с клиентским анализом
- **С AI API:** реальная генерация через **OpenAI o3 reasoning model**

### 6. 🔍 Отладка проблем

#### Проверьте в браузере (Dev Tools):
- **Console:** ошибки JavaScript
- **Network:** запросы к API

#### Проверьте в Supabase:
- **Functions:** логи Edge Function
- **Auth:** успешные входы пользователей

#### Проверьте в Vercel:
- **Functions:** логи деплоя
- **Environment Variables:** все переменные установлены

### 7. 📊 Мониторинг AI API

#### Использование OpenAI o3:
- Следите за использованием API в [OpenAI Dashboard](https://platform.openai.com/usage)
- Примерная стоимость: $0.05-0.15 за анализ (включая reasoning токены)
- Лимит: 300 запросов в день для o3

#### Рекомендации:
- Установите лимиты на использование API
- Кэшируйте результаты на 30-60 минут
- Мониторьте reasoning токены (не видны в ответе, но тарифицируются)
- Используйте `reasoning_effort: medium` для баланса качества и стоимости

### 8. 🛡️ Безопасность

✅ **Правильно:**
- API ключи хранятся в Supabase Secrets
- Аутентификация через Supabase Auth
- CORS настроен в Edge Function

❌ **Избегайте:**
- Хранения API ключей в переменных окружения Vercel
- Прямых запросов к OpenAI из браузера

---

## 🎉 Готово!

После выполнения всех шагов ваше приложение SubTracker будет полностью развернуто на Vercel с поддержкой AI инсайтов!

## 📞 Поддержка

При возникновении проблем проверьте:
1. Логи в Vercel Dashboard
2. Логи в Supabase Dashboard → Functions
3. Консоль браузера для ошибок JavaScript