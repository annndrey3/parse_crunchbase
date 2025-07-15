# Селекторы и точки данных Crunchbase

## 1. Основные данные компании (Company Overview)

**В DOM:**
- Название: `.profile-header .profile-name` или `h1.profile-name`
- Описание: `.description-section .description` или `[data-test="about-description"]`
- Логотип: `.profile-header img` или `[data-test="profile-image"]`
- Сайт: `[data-test="website-link"] a` или `.website-link a`
- Локация: `[data-test="hq-location"]` или `.location-section .location`
- Категории: `[data-test="categories"]` или `.categories-section .category-tag`
- Дата основания: `[data-test="founded-on"]` или `.founded-on-section`

**В JSON (`ng-state`):**
- `properties.name`
- `properties.short_description` или `properties.description`
- `properties.profile_image_url`
- `properties.website_url`
- `properties.location_identifiers`
- `properties.categories`
- `properties.founded_on`

---

## 2. Инвесторы (Investors)

**В DOM:**
- Блок инвесторов: `[data-test="investors-section"]` или `.investors-section`
- Список инвесторов: `.investor-list .investor-row` или `[data-test="investor-card"]`
- Имя инвестора: `.investor-row .name` или `[data-test="investor-name"]`

**В JSON:**
- `relationships.investors.items` (массив объектов с ключами `name`, `uuid`, `path`, `profile_image_url` и др.)

---

## 3. Раунды финансирования (Funding Rounds)

**В DOM:**
- Блок раундов: `[data-test="funding-rounds-section"]`
- Список раундов: `.funding-rounds-list .funding-round-row`
- Дата, сумма, тип: `.funding-round-row .date`, `.funding-round-row .amount`, `.funding-round-row .type`

**В JSON:**
- `relationships.funding_rounds.items` (каждый объект содержит `announced_on`, `money_raised`, `investment_type`, `investors` и др.)

---

## 4. Партнерства (Partners / Acquisitions)

**В DOM:**
- Блок партнерств: `[data-test="partners-section"]`
- Список: `.partners-list .partner-row`

**В JSON:**
- `relationships.partners.items`
- `relationships.acquisitions.items`

---

## 5. События (Events)

**В DOM:**
- Блок событий: `[data-test="events-section"]`
- Список: `.events-list .event-row`

**В JSON:**
- `relationships.events.items`

---

## 6. Советники, команда (Advisors, Team)

**В DOM:**
- Блок команды: `[data-test="team-section"]`
- Список: `.team-list .team-row`
- Имя, должность: `.team-row .name`, `.team-row .title`

**В JSON:**
- `relationships.current_team.items`
- `relationships.advisors.items`

---

## 7. Контакты (Contacts)

**В DOM:**
- `[data-test="contact-info-section"]`
- `.contact-info-list .contact-info-row`

**В JSON:**
- `relationships.contact_email.items`
- `relationships.contact_phone.items`

---

## 8. Социальные сети (Social Links)

**В DOM:**
- `[data-test="social-links-section"]`
- `.social-links-list a`

**В JSON:**
- `properties.facebook_url`
- `properties.linkedin_url`
- `properties.twitter_url`
- `properties.youtube_url`

---

## 9. Прочее (IPO, патенты, продукты, конкуренты и т.д.)

**В DOM:**
- `[data-test="ipo-section"]`
- `[data-test="products-section"]`
- `[data-test="competitors-section"]`

**В JSON:**
- `relationships.ipo.items`
- `relationships.products.items`
- `relationships.competitors.items`

---

## Пример структуры JSON (`ng-state`)

```json
{
  "properties": {
    "name": "OpenAI",
    "short_description": "...",
    "profile_image_url": "...",
    "website_url": "...",
    "location_identifiers": [...],
    "categories": [...],
    "founded_on": "2015-12-11",
    "facebook_url": "...",
    "linkedin_url": "...",
    ...
  },
  "relationships": {
    "investors": { "items": [ ... ] },
    "funding_rounds": { "items": [ ... ] },
    "partners": { "items": [ ... ] },
    "acquisitions": { "items": [ ... ] },
    "events": { "items": [ ... ] },
    "current_team": { "items": [ ... ] },
    "advisors": { "items": [ ... ] },
    "contact_email": { "items": [ ... ] },
    ...
  }
}
```

---

## Как искать

1. **В первую очередь**: ищи `<script id="ng-state" type="application/json">` и парсь содержимое как JSON.
2. **Если нет JSON**: используй селекторы выше для поиска в DOM.
3. **Если Cloudflare**: в HTML будет challenge, а не данные. 