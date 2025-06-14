# Настройка Google OAuth для SubTracker

## 1. Создание OAuth клиента в Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Создайте новый проект или выберите существующий
3. Включите Google Calendar API:
   - Перейдите в "APIs & Services" → "Library"
   - Найдите "Google Calendar API" и включите её
4. Перейдите в "APIs & Services" → "Credentials"
5. Нажмите "Create Credentials" → "API key" для создания API ключа
6. Нажмите "Create Credentials" → "OAuth client ID"
7. Если требуется, настройте OAuth consent screen:
   - Выберите "External" для публичного доступа
   - Заполните обязательные поля (название приложения, email поддержки)
   - Добавьте scopes: 
     - email
     - profile
     - https://www.googleapis.com/auth/calendar.events
8. Создайте OAuth 2.0 Client ID:
   - Application type: "Web application"
   - Name: "SubTracker"
   - Authorized JavaScript origins:
     - http://localhost:3000 (для локальной разработки через Docker)
     - http://localhost:5173 (для локальной разработки без Docker)
     - https://ваш-домен.com (для продакшена)
   - Authorized redirect URIs:
     - https://ВАШ-ПРОЕКТ.supabase.co/auth/v1/callback
     - http://localhost:5173/auth/callback (опционально для локальной разработки)

## 2. Включение Google Calendar API

1. В Google Cloud Console перейдите в "APIs & Services" → "Library"
2. Найдите "Google Calendar API" и включите его
3. Убедитесь, что в OAuth consent screen добавлен scope: `https://www.googleapis.com/auth/calendar.events`

## 3. Настройка в Supabase

1. Скопируйте Client ID и Client Secret из Google Console
2. Перейдите в Supabase Dashboard → Authentication → Providers
3. Найдите Google и включите его
4. Вставьте:
   - Client ID
   - Client Secret
5. Redirect URL уже будет заполнен автоматически (скопируйте его для шага 1.6)
6. Сохраните настройки

## 4. Проверка работы

1. Запустите приложение локально: `npm run dev`
2. Перейдите на страницу входа
3. Нажмите "Войти через Google"
4. Вы должны быть перенаправлены на страницу авторизации Google
5. После успешной авторизации вы вернетесь в приложение
6. При создании подписки автоматически будет создано напоминание в Google Calendar за 3 дня до платежа

## 5. Функциональность Google Calendar

Для пользователей, авторизованных через Google OAuth:

- **Автоматическое создание событий:** При добавлении новой подписки автоматически создается событие-напоминание в Google Calendar за 3 дня до даты платежа
- **Обновление событий:** При изменении подписки (название, сумма, дата) соответствующее событие в календаре обновляется
- **Удаление событий:** При удалении подписки связанное событие в календаре также удаляется
- **Время напоминания:** События создаются на 10:00 с уведомлениями за 10 минут (popup) и за 1 час (email)

### Формат события:
- **Название:** "Напоминание SubTracker: Платеж за [Название подписки]"
- **Описание:** "Через 3 дня ([Дата]) будет списание [Сумма] [Валюта] за подписку на '[Название]'"
- **Время:** 10:00-10:30 за 3 дня до платежа

## Возможные проблемы

- **Error 400: redirect_uri_mismatch** - проверьте, что redirect URI в Google Console точно совпадает с URI из Supabase
- **Unauthorized client** - убедитесь, что OAuth consent screen настроен и опубликован
- **Invalid client** - проверьте правильность Client ID и Client Secret
- **Error 403: Request had insufficient authentication scopes** - это означает, что пользователь авторизовался до добавления Calendar API scope. Решение:
  1. Выйдите из приложения
  2. Войдите снова через Google OAuth - приложение запросит новые разрешения
  3. Или используйте кнопку "Предоставить доступ к календарю" в желтом баннере в приложении

### Для существующих пользователей

Если вы уже авторизовались в приложении до добавления Calendar API:

1. **Автоматическое решение:** В приложении появится желтый баннер с кнопкой "Предоставить доступ к календарю" - нажмите на неё
2. **Ручное решение:** Выйдите из приложения и войдите заново через Google OAuth
3. **Альтернатива:** Отзовите разрешения в [Google Account settings](https://myaccount.google.com/permissions) для приложения SubTracker, затем войдите заново

## Переменные окружения

Убедитесь, что в файле `.env` есть:
```
VITE_SUPABASE_URL=https://ВАШ-ПРОЕКТ.supabase.co
VITE_SUPABASE_ANON_KEY=ваш-anon-ключ
VITE_GOOGLE_CLIENT_ID=ваш-google-client-id
VITE_GOOGLE_API_KEY=ваш-google-api-key
```

## Настройка Google Calendar интеграции

После настройки OAuth, приложение сможет:
1. Создавать события в Google Calendar за 3 дня до платежа
2. Обновлять события при изменении подписки
3. Удалять события при удалении подписки

Пользователю нужно будет дать разрешение на доступ к календарю при первом использовании функции.