# Okeno — Руководство по запуску без Replit

## Что было сделано

Все зависимости от Replit были убраны:
- ✅ Stripe теперь работает через стандартные API-ключи (не через Replit Connector)
- ✅ CORS настроен через `SERVER_URL` вместо `REPLIT_DOMAINS`
- ✅ Удалён пакет `stripe-replit-sync`
- ✅ Добавлен `dotenv` для загрузки переменных окружения
- ✅ Скрипты обновлены для локальной разработки
- ✅ EAS конфигурация обновлена

---

## 1. Бесплатная база данных PostgreSQL

Зарегистрируйся на **[Neon.tech](https://neon.tech)** (бесплатно, 0.5 GB):
1. Создай проект → получи `DATABASE_URL`
2. Формат: `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

**Альтернативы:**
- [Supabase](https://supabase.com) — бесплатно, 500 MB
- [Railway](https://railway.app) — $5 бесплатного кредита/мес
- [ElephantSQL](https://www.elephantsql.com) — бесплатно, 20 MB

---

## 2. Настройка .env

Отредактируй файл `.env` в корне проекта:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
EXPO_PUBLIC_DOMAIN=localhost:5000
SERVER_URL=http://localhost:5000
PORT=5000

# Stripe (необязательно для разработки)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 3. Запуск базы данных

```bash
npm run db:push
```

Это создаст все таблицы в PostgreSQL.

---

## 4. Запуск сервера

```bash
npm run server:dev
```

Сервер запустится на `http://localhost:5000`.

---

## 5. Запуск Expo (тестирование на устройстве)

В **отдельном** терминале:

```bash
npx expo start
```

Появится QR-код. Сканируй его через **Expo Go** на телефоне.

> ⚠️ Телефон и компьютер должны быть в одной Wi-Fi сети!
> В `.env` и `eas.json` замени `localhost` на свой IP (напр. `192.168.1.100:5000`)

Чтобы узнать свой IP:
```bash
# Windows
ipconfig
# Ищи IPv4 Address в Wi-Fi адаптере
```

---

## 6. Хостинг сервера (для продакшена / App Store)

### Вариант A: Railway.app (рекомендуется)
- Бесплатно: $5 кредита/мес
- Деплой из GitHub одним кликом
- Поддерживает PostgreSQL + Node.js

1. Залей код на GitHub
2. Подключи репозиторий в Railway
3. Добавь переменные окружения
4. Railway даст домен типа `okeno-production.up.railway.app`

### Вариант B: Render.com
- Бесплатный тарифный план для Web Services
- Автодеплой из GitHub
- PostgreSQL бесплатно (90 дней)

### Вариант C: Fly.io
- Бесплатных 3 shared-cpu VMs
- Глобальный CDN
- CLI деплой: `fly launch`

### Вариант D: VPS (самый дешёвый)
- [Hetzner](https://hetzner.cloud) — €3.79/мес
- [Oracle Cloud](https://cloud.oracle.com) — бесплатный Always Free тир

---

## 7. Отправка в App Store Connect

### Подготовка:
1. Apple Developer Account ($99/год) — обязательно
2. Установи EAS CLI: `npm install -g eas-cli`
3. Войди в аккаунт: `eas login`

### Обнови eas.json:
Замени `YOUR_SERVER_DOMAIN` на твой реальный домен (напр. `okeno-production.up.railway.app`):

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_DOMAIN": "okeno-production.up.railway.app"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "123456789",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

### Сборка и отправка:
```bash
# Сборка iOS
eas build --platform ios --profile production

# Отправка в App Store Connect
eas submit --platform ios --profile production
```

### Требования App Store (чеклист):
- ✅ Privacy Policy (уже есть в `privacy_policy_github.html`)
- ✅ Privacy Manifest (уже настроен в `app.json`)
- ✅ Описание разрешений камеры/фото/локации (уже есть)
- ✅ `usesNonExemptEncryption: false` (уже установлено)
- ⬜ Скриншоты (6.7" для iPhone, 12.9" для iPad)
- ⬜ Описание приложения
- ⬜ Иконка 1024x1024

---

## Структура переменных окружения

| Переменная | Описание | Обязательно |
|---|---|---|
| `DATABASE_URL` | PostgreSQL строка подключения | ✅ |
| `EXPO_PUBLIC_DOMAIN` | Домен API для клиента | ✅ |
| `SERVER_URL` | Полный URL сервера | ✅ |
| `PORT` | Порт сервера (по умолч. 5000) | ❌ |
| `STRIPE_SECRET_KEY` | Секретный ключ Stripe | ❌ |
| `STRIPE_PUBLISHABLE_KEY` | Публичный ключ Stripe | ❌ |
| `STRIPE_WEBHOOK_SECRET` | Секрет вебхука Stripe | ❌ |
| `OPENAI_API_KEY` | Ключ OpenAI (модерация) | ❌ |
