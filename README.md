# SubTracker

Простое веб-приложение для управления личными подписками с интеграцией Google Calendar.

## Функции

- 📋 Управление подписками (добавление, редактирование, удаление)
- 📊 Аналитика расходов и визуализация данных
- 📅 **Интеграция с Google Calendar** - автоматические напоминания за 3 дня до списания
- 🔐 Аутентификация пользователей
- 📱 Адаптивный дизайн

## Технологии

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth)
- **Calendar:** Google Calendar API
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

### 3. Настройка Google Calendar (опционально)

Для включения интеграции с календарем:

1. Следуйте инструкциям в `GOOGLE_OAUTH_SETUP.md`
2. Получите API ключи из Google Cloud Console
3. Добавьте их в `.env` файл
4. При добавлении/редактировании подписки включите опцию "Добавить напоминание в Google Calendar"

## Структура проекта

```
src/
├── components/          # Общие компоненты
├── features/
│   ├── auth/           # Аутентификация
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
- Переменные окружения для API ключей