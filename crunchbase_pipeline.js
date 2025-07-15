#!/usr/bin/env node
// crunchbase_pipeline.js
// Универсальный пайплайн: скачивание HTML через Puppeteer+AdsPower, парсинг ng-state/DOM через Cheerio, сохранение JSON с полной структурой, CLI-режим

require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
// Удаляю: const fetch = require('node-fetch');
// Удаляю: if (typeof fetch !== 'function') { ... }

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;
const MAKE_API_KEY = process.env.MAKE_API_KEY;

const ADSPOWER_PROFILE_ID = process.env.ADSPOWER_PROFILE_ID;
const HTMLS_DIR = path.join(__dirname, 'htmls');
const JSONS_DIR = path.join(__dirname, 'jsons');

const DEFAULT_FIELDS = {
  name: '',
  description: '',
  website: '',
  profile_url: '',
  contacts: {
    emails: [],
    phones: []
  },
  social_links: {
    facebook: '',
    linkedin: ''
  }
};

function slugify(url) {
  // https://www.crunchbase.com/organization/openai -> openai
  const m = url.match(/organization\/([\w-]+)/);
  return m ? m[1] : 'unknown';
}

async function connectAdsPower() {
  if (!ADSPOWER_PROFILE_ID) throw new Error('ADSPOWER_PROFILE_ID not set in .env');
  const apiUrl = `http://local.adspower.net:50325/api/v1/browser/start?user_id=${ADSPOWER_PROFILE_ID}`;
  const res = await fetch(apiUrl);
  const data = await res.json();
  if (data.code !== 0) throw new Error('AdsPower API error: ' + data.msg);
  const wsUrl = data.data.ws && data.data.ws.puppeteer;
  if (!wsUrl) throw new Error('No Puppeteer ws endpoint from AdsPower');
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const page = await browser.newPage();
  return { browser, page };
}

async function downloadHtmlWithPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const html = await page.content();
  return html;
}

// --- UNIVERSAL FIELD PARSERS (ng-state -> DOM fallback) ---
function getName(data, $) {
  if (data && data.properties) {
    for (const key of ['name', 'legal_name', 'title']) {
      if (data.properties[key]) return data.properties[key];
    }
  }
  const el = $('.profile-header .profile-name, h1.profile-name, span.entity-name').first();
  if (el.length) return el.text().trim();
  return '';
}
function getDescription(data, $) {
  if (data && data.properties) {
    for (const key of ['short_description', 'description', 'about', 'overview_description']) {
      if (data.properties[key]) return data.properties[key];
    }
  }
  let desc = '';
  $('.label').each((i, el) => {
    if ($(el).text().trim() === 'About the Company') {
      const tile = $(el).next('tile-description');
      if (tile.length) {
        desc = tile.find('.description').text().trim();
      }
    }
  });
  if (desc) return desc;
  const el = $('.description-section .description, [data-test="about-description"], .expanded-only-content, div.expanded-only-content, tile-description .description').first();
  if (el.length) return el.text().trim();
  return '';
}
function getWebsite(data, $) {
  if (data && data.properties && data.properties.website_url) return data.properties.website_url;
  const el = $('[data-test="website-link"] a, .website-link a').first();
  if (el.length && el.attr('href')) return el.attr('href');
  return '';
}
function getProfileUrl($) {
  // 1. <meta property="og:url" content="...">
  const meta = $('meta[property="og:url"]').attr('content');
  if (meta) return meta;
  // 2. <link rel="canonical" href="...">
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) return canonical;
  return '';
}
function getContacts(data, $) {
  const emails = [], phones = [];
  if (data && data.properties && data.properties.contact_fields) {
    const cf = data.properties.contact_fields;
    if (cf.contact_email) emails.push(cf.contact_email);
    if (cf.phone_number) phones.push(cf.phone_number);
  }
  if (data && data.relationships) {
    if (data.relationships.contact_email) emails.push(...(data.relationships.contact_email.items || []).map(i => i.value).filter(Boolean));
    if (data.relationships.contact_phone) phones.push(...(data.relationships.contact_phone.items || []).map(i => i.value).filter(Boolean));
  }
  // DOM fallback
  $('span:contains("Contact Email")').each((i, label) => {
    const field = $(label).closest('div.tile-field');
    let email = field.find('span.ng-star-inserted').text().trim();
    if (email && email.includes('@')) {
      email = email.replace(/^Contact Email\s*/i, '').trim();
      if (!emails.includes(email)) emails.push(email);
    }
  });
  $('span:contains("Phone Number")').each((i, label) => {
    const field = $(label).closest('div.tile-field');
    let phone = field.find('span.ng-star-inserted').text().trim();
    if (phone && phone.length > 5) {
      phone = phone.replace(/^Phone Number\s*/i, '').trim();
      phone = phone.replace(/^\+/, '');
      if (!phones.includes(phone)) phones.push(phone);
    }
  });
  return { emails, phones };
}
function getSocialLinks(data, $) {
  const socials = { facebook: '', linkedin: '' };
  if (data && data.properties) {
    if (data.properties.facebook_url) socials.facebook = data.properties.facebook_url;
    if (data.properties.linkedin_url) socials.linkedin = data.properties.linkedin_url;
  }
  $('a[href]').each((i, a) => {
    const href = $(a).attr('href');
    if (/facebook.com/i.test(href) && !/facebook.com\/crunchbase/i.test(href)) socials.facebook = href;
    if (/linkedin.com/i.test(href) && !/linkedin.com\/company\/crunchbase/i.test(href)) socials.linkedin = href;
  });
  return socials;
}

function parseCompanyUniversal(html) {
  const $ = cheerio.load(html);
  let data = null;
  const script = $('script#__NEXT_DATA__').html() || $('script#ng-state').html();
  if (script) {
    try {
      const json = JSON.parse(script);
      data = json.props && json.props.pageProps && json.props.pageProps.pageData ? json.props.pageProps.pageData : json;
    } catch (e) { data = null; }
  }
  const result = {
    name: getName(data, $),
    description: getDescription(data, $),
    website: getWebsite(data, $),
    profile_url: getProfileUrl($),
    contacts: getContacts(data, $),
    social_links: getSocialLinks(data, $)
  };
  return result;
}

function normalizeData(data) {
  return { ...DEFAULT_FIELDS, ...data };
}

function cleanObject(obj) {
  if (Array.isArray(obj)) {
    const arr = obj.map(cleanObject).filter(
      v => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0) && !(typeof v === 'object' && v !== null && Object.keys(v).length === 0)
    );
    return arr.length ? arr : undefined;
  }
  if (typeof obj === 'object' && obj !== null) {
    const cleaned = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleanedValue = cleanObject(v);
      if (
        cleanedValue !== undefined &&
        cleanedValue !== null &&
        !(typeof cleanedValue === 'string' && cleanedValue.trim() === '') &&
        !(Array.isArray(cleanedValue) && cleanedValue.length === 0) &&
        !(typeof cleanedValue === 'object' && cleanedValue !== null && Object.keys(cleanedValue).length === 0)
      ) {
        cleaned[k] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length ? cleaned : undefined;
  }
  if (typeof obj === 'string' && obj.trim() === '') return undefined;
  return obj;
}

async function sendToMake(data, companyName) {
  if (!MAKE_WEBHOOK_URL || MAKE_WEBHOOK_URL.includes('ВАШ_WEBHOOK_ID')) {
    console.log('Webhook URL не настроен, пропускаем отправку в Make');
    return;
  }
  
  try {
    const payload = {
      company: companyName,
      timestamp: new Date().toISOString(),
      data: data
    };
    
    const headers = { 'Content-Type': 'application/json' };
    if (MAKE_API_KEY) {
      headers['x-make-apikey'] = MAKE_API_KEY;
    }
    
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log(`[${companyName}] Данные отправлены в Make`);
    } else {
      console.error(`[${companyName}] Ошибка отправки в Make:`, response.status);
    }
  } catch (error) {
    console.error(`[${companyName}] Ошибка отправки в Make:`, error.message);
  }
}

async function processUrl(url, page) {
  const slug = slugify(url);
  const htmlPath = path.join(HTMLS_DIR, `${slug}.html`);
  const jsonPath = path.join(JSONS_DIR, `${slug}.json`);
  let html;
  if (await fs.pathExists(htmlPath)) {
    html = await fs.readFile(htmlPath, 'utf8');
    console.log(`[${slug}] HTML найден локально.`);
  } else if (page) {
    console.log(`[${slug}] Скачиваю HTML...`);
    try {
      html = await downloadHtmlWithPage(page, url);
      await fs.outputFile(htmlPath, html);
      console.log(`[${slug}] HTML сохранён.`);
    } catch (e) {
      console.error(`[${slug}] Ошибка скачивания:`, e.message);
      html = '';
    }
  } else {
    console.error(`[${slug}] Нет page для скачивания HTML.`);
    html = '';
  }
  let data = null;
  if (html) {
    data = parseCompanyUniversal(html);
  }
  if (!data) {
    console.log(`[${slug}] Данных нет, сохраняю пустую структуру.`);
    data = {};
  }
  const normalized = normalizeData(data);
  const cleaned = cleanObject(normalized);
  await fs.outputJson(jsonPath, cleaned, { spaces: 2 });
  console.log(`[${slug}] JSON сохранён.`);
  
  // Отправляем в Make
  await sendToMake(cleaned, slug);
  // Анализируем через Gemini и сохраняем результат
  // if (process.env.GEMINI_API_KEY) {
  //   await analyzeWithGemini(jsonPath, slug);
  // }
}

// === CLI-Progress для прогресс-бара ===
let cliProgress;
try { cliProgress = require('cli-progress'); } catch (e) { cliProgress = null; }

async function parseAllHtml(options = {}) {
  await fs.ensureDir(HTMLS_DIR);
  await fs.ensureDir(JSONS_DIR);
  let files = (await fs.readdir(HTMLS_DIR)).filter(f => f.endsWith('.html'));
  // --- Фильтрация по --filter и --has-field ---
  if (options.filter) {
    files = files.filter(f => f.toLowerCase().includes(options.filter.toLowerCase()));
  }
  if (options.hasField) {
    files = files.filter(f => {
      const jsonPath = path.join(JSONS_DIR, f.replace(/\.html$/, '.json'));
      if (!fs.existsSync(jsonPath)) return false;
      try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        return data && data[options.hasField] && (
          (Array.isArray(data[options.hasField]) && data[options.hasField].length) ||
          (typeof data[options.hasField] === 'object' && Object.keys(data[options.hasField]).length) ||
          (typeof data[options.hasField] === 'string' && data[options.hasField].trim() !== '')
        );
      } catch { return false; }
    });
  }
  // --- Прогресс-бар ---
  let bar = null;
  if (options.progress && cliProgress) {
    bar = new cliProgress.SingleBar({ format: '[{bar}] {percentage}% | {value}/{total} | {file}' }, cliProgress.Presets.shades_classic);
    bar.start(files.length, 0, { file: '' });
  }
  // --- Статистика ---
  const stats = { total: files.length, success: 0, error: 0, errors: [] };
  for (const file of files) {
    const htmlPath = path.join(HTMLS_DIR, file);
    const jsonPath = path.join(JSONS_DIR, file.replace(/\.html$/, '.json'));
    try {
      const html = await fs.readFile(htmlPath, 'utf8');
      const data = parseCompanyUniversal(html);
      const normalized = normalizeData(data);
      await fs.outputJson(jsonPath, normalized, { spaces: 2 });
      stats.success++;
      if (bar) bar.increment({ file });
      else console.log(`[${file}] JSON сохранён.`);
    } catch (e) {
      stats.error++;
      stats.errors.push({ file, error: e.message });
      if (bar) bar.increment({ file });
      else console.error(`[${file}] Ошибка:`, e.message);
    }
  }
  if (bar) bar.stop();
  // --- Отчёт ---
  if (options.report) {
    const report = {
      date: new Date().toISOString(),
      ...stats
    };
    const reportPath = path.join(__dirname, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log('\n=== ОТЧЁТ ===');
    console.log(`Всего: ${stats.total}`);
    console.log(`Успешно: ${stats.success}`);
    console.log(`Ошибки: ${stats.error}`);
    if (stats.errors.length) {
      console.log('Ошибки:');
      stats.errors.forEach(e => console.log(`  ${e.file}: ${e.error}`));
    }
    console.log(`Отчёт сохранён: ${reportPath}`);
  } else {
    console.log('Batch парсинг завершён.');
  }
}

async function main() {
  await fs.ensureDir(HTMLS_DIR);
  await fs.ensureDir(JSONS_DIR);
  const argv = require('yargs/yargs')(process.argv.slice(2))
    .option('url', { type: 'string', describe: 'Crunchbase URL' })
    .option('file', { type: 'string', describe: 'File with URLs' })
    .option('parse-html', { type: 'boolean', describe: 'Batch parse all HTMLs in htmls/' })
    .option('progress', { type: 'boolean', describe: 'Show progress bar for batch' })
    .option('report', { type: 'boolean', describe: 'Show/save report after batch' })
    .option('filter', { type: 'string', describe: 'Filter by company slug/filename' })
    .option('has-field', { type: 'string', describe: 'Filter by presence of field in JSON' })
    .conflicts('url', 'file')
    .check(argv => {
      if (!argv.url && !argv.file && !argv['parse-html']) {
        throw new Error('Укажите --url, --file или --parse-html');
      }
      return true;
    })
    .help().argv;
  if (argv['parse-html']) {
    await parseAllHtml({
      progress: argv.progress,
      report: argv.report,
      filter: argv.filter,
      hasField: argv['has-field']
    });
    return;
  }
  let urls = [];
  if (argv.url) {
    urls = [argv.url];
  } else if (argv.file) {
    const lines = await fs.readFile(argv.file, 'utf8');
    urls = lines.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  }
  let browser = null, page = null;
  try {
    ({ browser, page } = await connectAdsPower());
    // Задержка до 15 секунд перед первым парсингом
    await new Promise(r => setTimeout(r, 15000));
    for (const url of urls) {
      try {
        await processUrl(url, page);
        // Задержка 8 секунд между запросами
        await new Promise(r => setTimeout(r, 8000));
      } catch (e) {
        console.error(`[${url}] Ошибка:`, e.message);
      }
    }
  } catch (e) {
    console.error('Ошибка подключения к AdsPower:', e.message);
    for (const url of urls) {
      try {
        await processUrl(url, null);
      } catch (e) {
        console.error(`[${url}] Ошибка:`, e.message);
      }
    }
  } finally {
    if (page) await page.close();
    if (browser) await browser.disconnect();
  }
  console.log('Готово.');
}

// === Express endpoint for remote control ===
const express = require('express');
const app = express();
app.use(express.json());

app.post('/start-parsing', async (req, res) => {
  try {
    await main();
    res.json({ status: 'ok', message: 'Парсер запущен' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Endpoint для получения адреса сервера
app.get('/info', (req, res) => {
  const port = process.env.PARSER_PORT || 3000;
  const os = require('os');
  const ifaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(`http://${iface.address}:${port}`);
      }
    }
  }
  res.json({ addresses });
});

const PORT = process.env.PARSER_PORT || 3000;
app.listen(PORT, () => console.log(`Parser API listening on port ${PORT}`)); 

if (require.main === module) {
  // Всегда запускаем сервер Express (уже реализовано выше)

  // Ждать нажатия пробела для ручного запуска main()
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  console.log('Нажмите ПРОБЕЛ для ручного запуска парсера (или управляйте через бота/Make)...');

  process.stdin.on('data', function(key) {
    if (key === ' ') {
      console.log('Ручной запуск парсера...');
      // Всегда использовать --file company_urls.txt
      process.argv = process.argv.slice(0, 2).concat(['--file', 'company_urls.txt']);
      main();
    }
    // Для выхода по Ctrl+C
    if (key === '\u0003') {
      process.exit();
    }
  });
} 