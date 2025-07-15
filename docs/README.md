# Crunchbase Company Parser — Документация

## Архитектура проекта

- **stage 1:** Скачивание HTML (Playwright + AdsPower)
- **stage 2:** Парсинг HTML → JSON (этот этап)
- **stage 3:** Сохранение результатов, логирование ошибок

---

## Основной пайплайн парсинга

```python
import os
import json
from bs4 import BeautifulSoup

def parse_html_file(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    soup = BeautifulSoup(html, 'html.parser')
    # 1. Пробуем достать JSON из ng-state
    ng_state = soup.find('script', {'id': 'ng-state', 'type': 'application/json'})
    if ng_state:
        try:
            data = json.loads(ng_state.text)
        except Exception as e:
            print(f"JSON parse error: {e}")
            data = None
    else:
        data = None
    # 2. Если не нашли JSON — fallback на DOM
    return parse_company_data(data, soup)

def parse_company_data(data, soup):
    result = {}
    # ... тут вызовы функций для каждого поля ...
    return result

# Пример batch-парсинга

def batch_parse_htmls(html_dir, out_dir):
    for fname in os.listdir(html_dir):
        if not fname.endswith('.html'):
            continue
        html_path = os.path.join(html_dir, fname)
        result = parse_html_file(html_path)
        out_path = os.path.join(out_dir, fname.replace('.html', '.json'))
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
```

---

## Функции для парсинга каждого поля

### Название компании
```python
def get_name(data, soup):
    if data and 'properties' in data and 'name' in data['properties']:
        return data['properties']['name']
    el = soup.select_one('.profile-header .profile-name, h1.profile-name')
    return el.text.strip() if el else None
```

### Описание
```python
def get_description(data, soup):
    if data and 'properties' in data and 'short_description' in data['properties']:
        return data['properties']['short_description']
    el = soup.select_one('.description-section .description, [data-test="about-description"]')
    return el.text.strip() if el else None
```

### Логотип
```python
def get_logo(data, soup):
    if data and 'properties' in data and 'profile_image_url' in data['properties']:
        return data['properties']['profile_image_url']
    el = soup.select_one('.profile-header img, [data-test="profile-image"]')
    return el['src'] if el and el.has_attr('src') else None
```

### Сайт
```python
def get_website(data, soup):
    if data and 'properties' in data and 'website_url' in data['properties']:
        return data['properties']['website_url']
    el = soup.select_one('[data-test="website-link"] a, .website-link a')
    return el['href'] if el and el.has_attr('href') else None
```

### Локация
```python
def get_location(data, soup):
    if data and 'properties' in data and 'location_identifiers' in data['properties']:
        return data['properties']['location_identifiers']
    el = soup.select_one('[data-test="hq-location"], .location-section .location')
    return el.text.strip() if el else None
```

### Категории
```python
def get_categories(data, soup):
    if data and 'properties' in data and 'categories' in data['properties']:
        return data['properties']['categories']
    els = soup.select('[data-test="categories"], .categories-section .category-tag')
    return [el.text.strip() for el in els] if els else []
```

### Дата основания
```python
def get_founded_on(data, soup):
    if data and 'properties' in data and 'founded_on' in data['properties']:
        return data['properties']['founded_on']
    el = soup.select_one('[data-test="founded-on"], .founded-on-section')
    return el.text.strip() if el else None
```

### Инвесторы
```python
def get_investors(data, soup):
    if data and 'relationships' in data and 'investors' in data['relationships']:
        return [
            {
                'name': inv.get('name'),
                'uuid': inv.get('uuid'),
                'profile_image_url': inv.get('profile_image_url')
            }
            for inv in data['relationships']['investors'].get('items', [])
        ]
    els = soup.select('.investor-list .investor-row, [data-test="investor-card"]')
    return [el.text.strip() for el in els] if els else []
```

### Раунды финансирования
```python
def get_funding_rounds(data, soup):
    if data and 'relationships' in data and 'funding_rounds' in data['relationships']:
        return [
            {
                'announced_on': fr.get('announced_on'),
                'money_raised': fr.get('money_raised'),
                'investment_type': fr.get('investment_type'),
                'investors': fr.get('investors')
            }
            for fr in data['relationships']['funding_rounds'].get('items', [])
        ]
    return []
```

### Партнерства
```python
def get_partners(data, soup):
    if data and 'relationships' in data and 'partners' in data['relationships']:
        return data['relationships']['partners'].get('items', [])
    return []
```

### События
```python
def get_events(data, soup):
    if data and 'relationships' in data and 'events' in data['relationships']:
        return data['relationships']['events'].get('items', [])
    return []
```

### Команда
```python
def get_team(data, soup):
    if data and 'relationships' in data and 'current_team' in data['relationships']:
        return data['relationships']['current_team'].get('items', [])
    return []
```

### Советники
```python
def get_advisors(data, soup):
    if data and 'relationships' in data and 'advisors' in data['relationships']:
        return data['relationships']['advisors'].get('items', [])
    return []
```

### Контакты
```python
def get_contacts(data, soup):
    emails = []
    phones = []
    if data and 'relationships' in data:
        if 'contact_email' in data['relationships']:
            emails = [item.get('value') for item in data['relationships']['contact_email'].get('items', [])]
        if 'contact_phone' in data['relationships']:
            phones = [item.get('value') for item in data['relationships']['contact_phone'].get('items', [])]
    return {'emails': emails, 'phones': phones}
```

### Социальные сети
```python
def get_social_links(data, soup):
    links = {}
    if data and 'properties' in data:
        for key in ['facebook_url', 'linkedin_url', 'twitter_url', 'youtube_url']:
            if key in data['properties']:
                links[key.replace('_url', '')] = data['properties'][key]
    return links
```

---

## Итоговая сборка результата

```python
def parse_company_data(data, soup):
    return {
        'name': get_name(data, soup),
        'description': get_description(data, soup),
        'logo': get_logo(data, soup),
        'website': get_website(data, soup),
        'location': get_location(data, soup),
        'categories': get_categories(data, soup),
        'founded_on': get_founded_on(data, soup),
        'investors': get_investors(data, soup),
        'funding_rounds': get_funding_rounds(data, soup),
        'partners': get_partners(data, soup),
        'events': get_events(data, soup),
        'team': get_team(data, soup),
        'advisors': get_advisors(data, soup),
        'contacts': get_contacts(data, soup),
        'social_links': get_social_links(data, soup),
    }
```

---

## Советы по обработке ошибок и логированию

- Логируйте ошибки парсинга JSON и отсутствие нужных блоков.
- Сохраняйте исходный HTML при ошибках для последующего анализа.
- Для каждого поля делайте fallback на DOM, если нет данных в JSON.
- Для сложных вложенных структур (например, инвесторы, раунды) сохраняйте как есть, либо делайте маппинг по нужным ключам.

---

## requirements.txt

```
beautifulsoup4
lxml
```

---

## Пример запуска

```bash
python batch_html_parser.py --html_dir ./htmls --out_dir ./jsons
``` 