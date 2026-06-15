# SubTracker

Простое веб-приложение для управления личными подписками с интеграцией Google Calendar.

## Функции

- 📋 Управление подписками (добавление, редактирование, удаление)
- 📊 Аналитика расходов и визуализация данных
- 📅 **Интеграция с Google Calendar** - автоматические напоминания за 3 дня до списания
- 🤖 **AI Инсайты** - персонализированные рекомендации по оптимизации расходов через OpenAI o3
- 🔐 Аутентификация пользователей
- 📱 Адаптивный дизайн

## Технологии

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Calendar:** Google Calendar API
- **AI:** OpenAI o3 reasoning model
- **Build:** Vite
- **Containerization:** Docker

## Быстрый старт

### 1. Клонирование и запуск

```bash
git clone <repository-url>
cd sub_manager
docker-compose up -d
```

Приложение будет доступно по адресу: http://localhost:3000

### 2. Настройка переменных окружения

```bash
cp .env.example .env
# Отредактируйте .env файл с вашими ключами
```

### 3. Настройка интеграций (опционально)

#### Google Calendar
1. Следуйте инструкциям в `GOOGLE_OAUTH_SETUP.md`
2. Получите API ключи из Google Cloud Console
3. Добавьте их в `.env` файл
4. При добавлении/редактировании подписки включите опцию "Добавить напоминание в Google Calendar"

#### AI Инсайты
1. Следуйте инструкциям в `AI_INSIGHTS_SETUP.md`
2. Получите OpenAI API ключ
3. Настройте в Supabase Dashboard > Settings > Secrets
4. Добавьте переменные AI API в `.env` файл

## Структура проекта

```
src/
├── components/          # Общие компоненты
├── features/
│   ├── auth/           # Аутентификация
│   ├── ai-insights/    # AI анализ и рекомендации
│   ├── calendar/       # Google Calendar интеграция
│   └── subscriptions/  # Управление подписками
├── pages/              # Страницы приложения
├── services/           # API сервисы
└── types/              # TypeScript типы
```

## Разработка

```bash
# Запуск в режиме разработки
docker-compose up -d

# Проверка типов
npm run typecheck

# Линтинг
npm run lint

# Сборка для продакшена
npm run build
```

## Google Calendar API

Приложение поддерживает автоматическое создание событий в Google Calendar:

- ✅ Создание событий при добавлении подписки
- ✅ Обновление событий при изменении данных
- ✅ Удаление событий при удалении подписки
- ✅ Напоминания за 3 дня (popup + email)
- ✅ Опциональная интеграция (можно включить/выключить)

### Устранение проблем с OAuth

Если возникает ошибка `400: invalid_request`, см. `FIX_OAUTH_ERROR.md`

## AI Инсайты

Приложение предоставляет персональный финансовый анализ подписок с помощью OpenAI o3:

- ✅ **Персональный анализ** - связный текстовый формат вместо отдельных карточек
- ✅ **Дружелюбный тон** - AI как персональный финансовый консультант
- ✅ **Оптимизация расходов** - рекомендации с конкретными суммами экономии
- ✅ **Выявление дубликатов** - анализ сервисов с похожей функциональностью
- ✅ **Персональные рекомендации** - новые подписки на основе интересов
- ✅ **Dual-mode** - автоматический fallback на демо-режим

### Архитектура AI системы

- **Supabase Edge Function** с OpenAI o3 reasoning model
- **Текстовый формат** - персональный анализ в связном виде
- **Безопасное хранение** API ключей в Supabase Vault
- **Reasoning токены** для улучшенного качества анализа
- **Автоматическая обработка ошибок** и graceful degradation

## База данных

Проект использует Supabase PostgreSQL с таблицей `subscriptions`:

```sql
-- Основные поля
id, name, amount, currency, billing_period, next_payment_date
category, url, user_id, created_at, updated_at

-- Для Google Calendar интеграции
google_calendar_event_id
```

## Безопасность

- Row Level Security (RLS) в Supabase
- Пользователи видят только свои подписки
- OAuth 2.0 для Google Calendar
- Обновление Google access token через защищённую Supabase Edge Function
- Переменные окружения для API ключей
