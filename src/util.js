/**
 * Small, dependency-free helpers for reading real-world HTML.
 * The parser is deliberately forgiving: launch pages are messy.
 */

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', copy: '©', reg: '®', trade: '™',
  middot: '·', bull: '•', check: '✓', times: '×', rarr: '→',
};

export function decodeEntities(input = '') {
  return String(input)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeChar(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeChar(parseInt(dec, 10)))
    .replace(/&([a-z][a-z0-9]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

function safeChar(code) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** Parse attributes from an opening tag such as `<meta name="x" content="y">`. */
export function attrs(tag = '') {
  const out = {};
  const body = String(tag)
    .replace(/^<\s*\/?\s*[a-zA-Z][a-zA-Z0-9:-]*/, '')
    .replace(/\/?>\s*$/, '');
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(body))) {
    const key = m[1].toLowerCase();
    out[key] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

/** All opening tags with a given name. */
export function tags(html = '', name) {
  const re = new RegExp(`<${name}\\b[^>]*>`, 'gi');
  return String(html).match(re) || [];
}

/** All `<a>` links with attrs and visible text. */
export function links(html = '') {
  const out = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const a = attrs(`<a ${m[1]}>`);
    out.push({ ...a, href: a.href || '', text: cleanText(m[2]), raw: m[0] });
  }
  return out;
}

/** All `<img>` tags with attrs. */
export function images(html = '') {
  return tags(html, 'img').map((tag) => attrs(tag));
}

/** All forms, their fields and raw markup. */
export function forms(html = '') {
  const out = [];
  const re = /<form\b([^>]*)>([\s\S]*?)<\/form\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const body = m[2] || '';
    const inputs = tags(body, 'input').map((t) => attrs(t));
    const textareas = tags(body, 'textarea').map((t) => attrs(t));
    const selects = tags(body, 'select').map((t) => attrs(t));
    const buttons = [];
    const buttonRe = /<button\b([^>]*)>([\s\S]*?)<\/button\s*>/gi;
    let bm;
    while ((bm = buttonRe.exec(body))) {
      buttons.push({ ...attrs(`<button ${bm[1]}>`), text: cleanText(bm[2]) });
    }
    out.push({ ...attrs(`<form ${m[1]}>`), body, inputs, textareas, selects, buttons });
  }
  return out;
}

export function headings(html = '') {
  const out = [];
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    out.push({ level: Number(m[1]), text: cleanText(m[2]) });
  }
  return out;
}

export function meta(html = '') {
  const out = {};
  for (const tag of tags(html, 'meta')) {
    const a = attrs(tag);
    const key = (a.name || a.property || a.itemprop || '').toLowerCase();
    if (key) out[key] = a.content || '';
  }
  return out;
}

export function jsonLd(html = '') {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const items = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];
      for (const item of items) if (item && typeof item === 'object') out.push(item);
    } catch {
      out.push({ __invalid: true });
    }
  }
  return out;
}

/** Strip scripts/styles/tags and return readable text. */
export function cleanText(html = '') {
  return decodeEntities(
    String(html)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function visibleText(html = '') {
  return cleanText(
    String(html)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, ' '),
  );
}

export function hasText(text = '', patterns = []) {
  const haystack = String(text).toLowerCase();
  return patterns.some((p) => (p instanceof RegExp ? p.test(haystack) : haystack.includes(String(p).toLowerCase())));
}

export function firstMatch(text = '', patterns = []) {
  const haystack = String(text).toLowerCase();
  for (const p of patterns) {
    const m = p instanceof RegExp ? haystack.match(p) : haystack.includes(String(p).toLowerCase()) ? [String(p)] : null;
    if (m) return m[0];
  }
  return null;
}

export function absolute(href = '', base = '') {
  try {
    return new URL(href, base).href;
  } catch {
    return '';
  }
}

export function sameOrigin(href = '', base = '') {
  try {
    return new URL(href, base).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

export function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

export function pct(part, total, digits = 0) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(digits));
}

export function kb(bytes) {
  if (bytes == null) return '?';
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function letterGrade(score) {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D+';
  if (score >= 40) return 'D';
  return 'F';
}

export function gradeColor(grade = '') {
  if (grade.startsWith('A')) return '#3ddc84';
  if (grade.startsWith('B')) return '#c6ff4a';
  if (grade.startsWith('C')) return '#ffb020';
  if (grade.startsWith('D')) return '#ff7a45';
  return '#ff5c5c';
}

export function gradeLabel(score) {
  if (score >= 90) return 'Launch-ready';
  if (score >= 80) return 'Almost there';
  if (score >= 70) return 'Needs polish';
  if (score >= 60) return 'Risky launch';
  return 'Not ready';
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncate(value = '', n = 120) {
  const s = String(value).replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function hostOf(url = '') {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
