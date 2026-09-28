const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'assets', 'dictionary', 'zho-rus', 'zho-rus.tei');
const directIndexPath = path.join(root, 'assets', 'dictionary', 'wikdict-ru-zh', 'stardict.idx');
const directDataPath = path.join(root, 'assets', 'dictionary', 'wikdict-ru-zh', 'stardict.dict');
const outPath = path.join(root, 'assets', 'dictionary', 'ru-zh-dictionary.json');
const metaPath = path.join(root, 'assets', 'dictionary', 'ru-zh-dictionary-meta.json');
const formIndexPath = path.join(root, 'assets', 'dictionary', 'ru-form-index.json');
const morphologySources = [
  {
    path: path.join(root, 'assets', 'dictionary', 'openrussian-nouns.csv'),
    fields: ['bare', 'sg_nom', 'sg_gen', 'sg_dat', 'sg_acc', 'sg_inst', 'sg_prep', 'pl_nom', 'pl_gen', 'pl_dat', 'pl_acc', 'pl_inst', 'pl_prep']
  },
  {
    path: path.join(root, 'assets', 'dictionary', 'openrussian-verbs.csv'),
    fields: ['bare', 'partner', 'imperative_sg', 'imperative_pl', 'past_m', 'past_f', 'past_n', 'past_pl', 'presfut_sg1', 'presfut_sg2', 'presfut_sg3', 'presfut_pl1', 'presfut_pl2', 'presfut_pl3']
  },
  {
    path: path.join(root, 'assets', 'dictionary', 'openrussian-adjectives.csv'),
    fields: ['bare', 'comparative', 'superlative', 'short_m', 'short_f', 'short_n', 'short_pl', 'decl_m_nom', 'decl_m_gen', 'decl_m_dat', 'decl_m_acc', 'decl_m_inst', 'decl_m_prep', 'decl_f_nom', 'decl_f_gen', 'decl_f_dat', 'decl_f_acc', 'decl_f_inst', 'decl_f_prep', 'decl_n_nom', 'decl_n_gen', 'decl_n_dat', 'decl_n_acc', 'decl_n_inst', 'decl_n_prep', 'decl_pl_nom', 'decl_pl_gen', 'decl_pl_dat', 'decl_pl_acc', 'decl_pl_inst', 'decl_pl_prep']
  },
  {
    path: path.join(root, 'assets', 'dictionary', 'openrussian-others.csv'),
    fields: ['bare']
  }
];
const existingMeta = fs.existsSync(metaPath)
  ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  : {};

function decodeXml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasCyrillic(value) {
  return /[а-яё]/i.test(value);
}

function isCleanRussianTerm(value) {
  const normalized = normalizeRussian(value);
  return /^[а-яё][а-яё\s-]{1,79}$/i.test(normalized) && hasCyrillic(normalized);
}

function normalizeRussian(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0301'’`]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCsv(text) {
  const rows = [];
  const delimiter = text.indexOf('\t') >= 0 && text.indexOf('\n') > text.indexOf('\t') ? '\t' : ',';
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function isSingleRussianForm(value) {
  const normalized = normalizeRussian(value);
  return /^[а-яё-]{2,80}$/i.test(normalized);
}

function buildRussianFormIndex(dictionary) {
  const dictionaryKeys = new Set(dictionary.map(entry => normalizeRussian(entry.ru)));
  const aliases = new Map();
  let sourceRows = 0;

  const addAlias = (form, lemma) => {
    const formKey = normalizeRussian(form);
    const lemmaKey = normalizeRussian(lemma);
    if (!dictionaryKeys.has(lemmaKey) || !isSingleRussianForm(formKey)) return;
    if (!aliases.has(formKey)) aliases.set(formKey, []);
    const values = aliases.get(formKey);
    if (!values.includes(lemmaKey) && values.length < 6) values.push(lemmaKey);
  };

  morphologySources.forEach(source => {
    if (!fs.existsSync(source.path)) return;
    const rows = parseCsv(fs.readFileSync(source.path, 'utf8'));
    if (!rows.length) return;
    const headers = rows[0].map((header, index) => index === 0 ? header.replace(/^\uFEFF/, '') : header);
    const positions = source.fields
      .map(field => ({ index: headers.indexOf(field), field }))
      .filter(item => item.index >= 0);
    rows.slice(1).forEach(row => {
      const lemma = row[headers.indexOf('bare')];
      if (!lemma || !dictionaryKeys.has(normalizeRussian(lemma))) return;
      sourceRows += 1;
      positions.forEach(position => addAlias(row[position.index], lemma));
    });
  });

  const compact = {};
  [...aliases.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'ru'))
    .forEach(([form, lemmas]) => {
      compact[form] = lemmas;
    });
  return { index: compact, sourceRows };
}

function addLimited(set, value, limit) {
  if (!value || set.size >= limit) return;
  set.add(value);
}

function parseDirectStarDict() {
  if (!fs.existsSync(directIndexPath) || !fs.existsSync(directDataPath)) return [];
  const index = fs.readFileSync(directIndexPath);
  const dict = fs.readFileSync(directDataPath);
  const entries = [];
  let cursor = 0;
  while (cursor < index.length) {
    const wordEnd = index.indexOf(0, cursor);
    if (wordEnd < 0 || wordEnd + 9 > index.length) break;
    const word = index.subarray(cursor, wordEnd).toString('utf8').trim();
    const offset = index.readUInt32BE(wordEnd + 1);
    const size = index.readUInt32BE(wordEnd + 5);
    const html = dict.subarray(offset, offset + size).toString('utf8');
    const zh = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    const cleanedZh = zh.replace(/^(noun|verb|adjective|adverb|pronoun|preposition)\s+/i, '').trim();
    if (isCleanRussianTerm(word) && cleanedZh) {
      entries.push({ ru: word, zh: [cleanedZh], pos: [], source: 'WikDict direct' });
    }
    cursor = wordEnd + 9;
  }
  return entries;
}

const entries = new Map();
const entryPattern = /<entry\b[\s\S]*?<\/entry>/g;
let match;
let sourceEntries = 0;
const existingSupplementPath = fs.existsSync(outPath) ? outPath : null;
const xml = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, 'utf8') : '';

while ((match = entryPattern.exec(xml))) {
  const block = match[0];
  sourceEntries += 1;
  const orthMatch = block.match(/<orth>([\s\S]*?)<\/orth>/);
  if (!orthMatch) continue;

  const zh = decodeXml(orthMatch[1]);
  if (!zh || /[а-яё]/i.test(zh)) continue;

  const posMatch = block.match(/<pos>([\s\S]*?)<\/pos>/);
  const pos = posMatch ? decodeXml(posMatch[1]) : '';
  const quoteMatches = [...block.matchAll(/<quote>([\s\S]*?)<\/quote>/g)];

  quoteMatches.forEach(quoteMatch => {
    const ru = decodeXml(quoteMatch[1]);
    if (!ru || !isCleanRussianTerm(ru)) return;
    const key = normalizeRussian(ru);
    if (!key || key.length < 2) return;
    if (!entries.has(key)) entries.set(key, { ru, zh: new Set(), pos: new Set() });
    const entry = entries.get(key);
    addLimited(entry.zh, zh, 10);
    addLimited(entry.pos, pos, 4);
  });
}

if (!xml && existingSupplementPath) {
  const existing = JSON.parse(fs.readFileSync(existingSupplementPath, 'utf8'));
  existing.forEach(entry => {
    if (entry.source === 'WikDict direct') return;
    entries.set(normalizeRussian(entry.ru), {
      ru: entry.ru,
      zh: new Set(entry.zh || []),
      pos: new Set(entry.pos || [])
    });
  });
  sourceEntries = existing.length;
}

const data = [...entries.values()]
  .map(entry => ({
    ru: entry.ru,
    zh: [...entry.zh],
    pos: [...entry.pos].filter(Boolean),
    ...(entry.source ? { source: entry.source } : {})
  }))
  .sort((a, b) => a.ru.localeCompare(b.ru, 'ru'));

const directEntries = parseDirectStarDict();
const hasPrimarySources = Boolean(xml || directEntries.length);
if (!hasPrimarySources && existingSupplementPath) {
  const existing = JSON.parse(fs.readFileSync(existingSupplementPath, 'utf8'));
  existing.forEach(entry => {
    const key = normalizeRussian(entry.ru);
    if (!key || entries.has(key)) return;
    entries.set(key, {
      ru: entry.ru,
      zh: new Set(entry.zh || []),
      pos: new Set(entry.pos || []),
      source: entry.source
    });
  });
}
const merged = new Map(directEntries.map(entry => [normalizeRussian(entry.ru), entry]));
const supplementData = hasPrimarySources
  ? data
  : [...entries.values()].map(entry => ({
    ru: entry.ru,
    zh: [...entry.zh],
    pos: [...entry.pos].filter(Boolean),
    ...(entry.source ? { source: entry.source } : {})
  }));
supplementData.forEach(entry => {
  const key = normalizeRussian(entry.ru);
  if (!merged.has(key)) {
    merged.set(key, entry);
    return;
  }
  const existing = merged.get(key);
  const meanings = new Set([...(existing.zh || []), ...(entry.zh || [])]);
  existing.zh = [...meanings].slice(0, 12);
});

const finalData = [...merged.values()]
  .sort((a, b) => a.ru.localeCompare(b.ru, 'ru'));

const existingFormIndex = fs.existsSync(formIndexPath)
  ? JSON.parse(fs.readFileSync(formIndexPath, 'utf8'))
  : {};
const morphologyAvailable = morphologySources.some(source => fs.existsSync(source.path));
const formIndexResult = morphologyAvailable
  ? buildRussianFormIndex(finalData)
  : { index: existingFormIndex, sourceRows: 0 };
fs.writeFileSync(outPath, JSON.stringify(finalData));
fs.writeFileSync(formIndexPath, JSON.stringify(formIndexResult.index));
fs.writeFileSync(metaPath, JSON.stringify({
  source: 'WikDict direct Russian-Chinese plus FreeDict Chinese-Russian supplement',
  sourceUrl: 'https://download.wikdict.com/dictionaries/stardict/',
  morphologySource: 'OpenRussian word forms',
  morphologySourceUrl: 'https://github.com/Badestrand/russian-dictionary',
  licenses: [
    {
      source: 'WikDict direct Russian-Chinese',
      license: 'Creative Commons Attribution-ShareAlike 4.0 International',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/legalcode'
    },
    {
      source: 'FreeDict Chinese-Russian supplement',
      license: 'Creative Commons Attribution-ShareAlike 3.0 Unported',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/legalcode'
    },
    {
      source: 'OpenRussian morphology forms',
      license: 'Creative Commons Attribution-ShareAlike 4.0 International',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/legalcode'
    }
  ],
  sourceEntries: hasPrimarySources ? sourceEntries : (existingMeta.sourceEntries || sourceEntries),
  directEntries: hasPrimarySources ? directEntries.length : (existingMeta.directEntries || directEntries.length),
  supplementEntries: hasPrimarySources ? supplementData.length : (existingMeta.supplementEntries || supplementData.length),
  russianEntries: finalData.length,
  morphologyRows: morphologyAvailable ? formIndexResult.sourceRows : (existingMeta.morphologyRows || formIndexResult.sourceRows),
  formAliases: Object.keys(formIndexResult.index).length,
  generatedAt: new Date().toISOString()
}, null, 2));

console.log(JSON.stringify({
  sourceEntries: hasPrimarySources ? sourceEntries : (existingMeta.sourceEntries || sourceEntries),
  directEntries: hasPrimarySources ? directEntries.length : (existingMeta.directEntries || directEntries.length),
  supplementEntries: hasPrimarySources ? supplementData.length : (existingMeta.supplementEntries || supplementData.length),
  russianEntries: finalData.length,
  morphologyRows: morphologyAvailable ? formIndexResult.sourceRows : (existingMeta.morphologyRows || formIndexResult.sourceRows),
  formAliases: Object.keys(formIndexResult.index).length
}, null, 2));
