# Crunchbase Universal Parser

## Описание

Универсальный парсер Crunchbase на Node.js:
- Скачивает HTML через Puppeteer+AdsPower (использует профиль браузера).
- Парсит данные из ng-state/DOM через Cheerio.
- Сохраняет результат в JSON с минимальной структурой (только нужные поля).
- Поддерживает CLI и batch-режим (обработка всех файлов из папки).
- Интегрируется с Make.com через webhook.

---

## Примеры CLI-запусков

**Парсинг одной компании по URL:**
```bash
node crunchbase_pipeline.js --url "https://www.crunchbase.com/organization/openai"
```

**Пакетный парсинг по списку:**
```bash
node crunchbase_pipeline.js --file company_urls.txt --progress --report
```

**Парсинг уже скачанных HTML:**
```bash
node crunchbase_pipeline.js --parse-html --progress --report
```

**Фильтрация по имени/slug:**
```bash
node crunchbase_pipeline.js --parse-html --filter microsoft
```

---

## Итоговая структура JSON

```json
{
  "name": "OpenAI",
  "description": "OpenAI is an AI research and deployment company...",
  "website": "https://openai.com/",
  "profile_url": "https://www.crunchbase.com/organization/openai",
  "contacts": {
    "emails": ["info@openai.com"],
    "phones": ["123-456-7890"]
  },
  "social_links": {
    "facebook": "https://facebook.com/openai",
    "linkedin": "https://linkedin.com/company/openai"
  }
}
```

---

## Интеграция с Make.com

1. **Создайте Custom Webhook в Make:**
   - Модуль: Webhooks > Custom Webhook (INSTANT)
   - Скопируйте URL и добавьте его в `.env` как `MAKE_WEBHOOK_URL`

2. **Маппинг данных:**
   - В Make данные приходят в поле `data`:
     - `{{1.data.name}}`
     - `{{1.data.website}}`
     - `{{1.data.contacts.emails[]}}`
     - `{{1.data.contacts.phones[]}}`
     - `{{1.data.social_links.facebook}}`
     - `{{1.data.social_links.linkedin}}`
     - `{{1.data.description}}`
     - `{{1.data.profile_url}}`

3. **Рекомендации по маппингу:**
   - Для массивов используйте `?join()` или `exists()` для проверки наличия.
   - Пример: `{{1.data.contacts.emails[]?join(", ")}}`
   - Для пустых значений используйте фильтры в Make.

4. **Дальнейшая обработка:**
   - Можно отправлять данные в Google Sheets, Gmail, Notion, Gemini и др.
   - Для интеграции с Gemini используйте модуль Gemini в Make (или Google Cloud).

---

## Переменные окружения

- `ADSPOWER_PROFILE_ID` — ID профиля AdsPower
- `MAKE_WEBHOOK_URL` — Webhook Make.com
- (остальные переменные по необходимости)

---

## Рекомендации

- Используйте только нужные поля для интеграций.
- Для массового парсинга используйте batch-режим с прогресс-баром и отчётом.
- Для автоматизации запуска используйте ngrok или VPS.
- Для безопасности не публикуйте .env и API-ключи.

---

## Контакты