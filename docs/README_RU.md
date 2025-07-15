# Документация по парсеру Crunchbase

- **PIPELINE.md** — архитектура пайплайна и этапы работы
- **SELECTORS.md** — все селекторы и точки данных для парсинга
- **README.md** — подробная инструкция с примерами кода для парсера
- **requirements.txt** — зависимости для парсера

## Быстрый старт

1. Установите зависимости:
   ```bash
   pip install -r docs/requirements.txt
   ```
2. Запустите парсер:
   ```bash
   python batch_html_parser.py --html_dir ./htmls --out_dir ./jsons
   ```
3. Изучите примеры кода и маппинга в docs/README.md

## О проекте

Парсер предназначен для извлечения расширенных данных о компаниях с Crunchbase, устойчив к Cloudflare, поддерживает работу с AdsPower и Playwright, сохраняет HTML и JSON, логирует ошибки и легко масштабируется. 