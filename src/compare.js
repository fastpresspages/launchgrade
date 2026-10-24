import { readFile } from 'node:fs/promises';
import { CATEGORIES } from './checks.js';

const ANSI = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  gray: '\x1b[90m',
};

const RANK = { pass: 0, warn: 1, fail: 2, error: 2 };

function assertShape(report, source) {
  const where = source ? ` (${source})` : '';
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error(`baseline is not a LaunchGrade report${where}. Expected the JSON written by launchgrade (--json or report.json).`);
  }
  if (report.tool && report.tool !== 'launchgrade') {
    throw new Error(`baseline is not a LaunchGrade report${where} — tool is “${report.tool}”.`);
  }
  for (const field of ['category', 'status']) {
    if ((report.checks?.length ?? 0) > 0 && !(field in report.checks[0])) {
      throw new Error(`baseline report is missing checks[].${field}${where}; not a LaunchGrade scan output.`);
    }
  }
  if (typeof report.score !== 'number' || typeof report.grade !== 'string' || !Array.isArray(report.checks)) {
    throw new Error(`baseline is missing score/grade/checks${where}. Re-generate with “launchgrade <url> --out reports” and pass that report.json.`);
  }
}

export function compareResults(baseline, current) {
  assertShape(baseline, 'baseline');
  const before = new Map((baseline.checks || []).map((c) => [c.id, c]));
  const after = new Map((current.checks || []).map((c) => [c.id, c]));

  const moved = [];
  const added = [];
  const removed = [];

  for (const [id, check] of after) {
    const old = before.get(id);
    if (!old) {
      added.push({ id, title: check.title, category: check.category, status: check.status });
      continue;
    }
    const rankBefore = RANK[old.status] ?? 1;
    const rankAfter = RANK[check.status] ?? 1;
    if (rankAfter === rankBefore) continue;
    moved.push({
      id,
      title: check.title,
      category: check.category,
      before: old.status,
      after: check.status,
      kind: rankAfter < rankBefore ? 'improved' : 'regressed',
    });
  }
  for (const [id, check] of before) {
    if (!after.has(id)) {
      removed.push({ id, title: check.title, category: check.category, status: check.status });
    }
  }
  moved.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'improved' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  const beforeCats = new Map((baseline.categories || []).map((c) => [c.key, c]));
  const afterCats = new Map((current.categories || []).map((c) => [c.key, c]));
  const categories = [];
  for (const [key, meta] of Object.entries(CATEGORIES)) {
    const b = beforeCats.get(key)?.score ?? null;
    const a = afterCats.get(key)?.score ?? null;
    const delta = b === null || a === null ? null : a - b;
    categories.push({ key, label: meta.label, before: b, after: a, delta });
  }

  const countsDelta = {};
  for (const kind of ['pass', 'warn', 'fail', 'error', 'info']) {
    const b = baseline.counts?.[kind] ?? 0;
    const a = current.counts?.[kind] ?? 0;
    countsDelta[kind] = a - b;
  }

  return {
    overall: {
      before: baseline.score,
      after: current.score,
      delta: current.score - baseline.score,
      beforeGrade: baseline.grade,
      afterGrade: current.grade,
      beforeLabel: baseline.label || '',
      afterLabel: current.label || '',
    },
    countsDelta,
    categories,
    moved,
    added,
    removed,
    baseline: {
      url: baseline.url || '',
      grade: baseline.grade,
      score: baseline.score,
      label: baseline.label || '',
      generatedAt: baseline.generatedAt || '',
    },
  };
}

export async function loadBaseline(path) {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Baseline file not found: ${path}. Pass the report.json from an earlier scan.`);
    }
    throw error;
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Baseline file ${path} is not valid JSON.`);
  }
}

function arrow(delta, plain = false) {
  if (delta > 0) return `▲ +${delta}`;
  if (delta < 0) return `▼ ${delta}`;
  return plain ? 'same' : '· same';
}

export function renderCompareTerminal(comparison, options = {}) {
  const color = options.color !== false && !process.env.NO_COLOR;
  const c = (code, text) => (color ? `${code}${text}${ANSI.reset}` : text);
  const { overall, categories, moved, added, removed } = comparison;
  const lines = [];
  lines.push('');
  lines.push(c(ANSI.bold + '  Compare ', ` vs baseline: ${overall.before}/100 (${overall.beforeGrade}) → ${overall.after}/100 (${overall.afterGrade})  ${arrow(overall.delta)}`));
  if (overall.beforeLabel || overall.afterLabel) {
    lines.push(c(ANSI.gray, `  ${overall.beforeLabel}  →  ${overall.afterLabel}`));
  }
  lines.push('');
  for (const cat of categories) {
    if (cat.before === null && cat.after === null) continue;
    const deltaText = cat.delta === null ? 'n/a' : arrow(cat.delta);
    const tint = cat.delta > 0 ? ANSI.green : cat.delta < 0 ? ANSI.red : ANSI.gray;
    lines.push(`  ${cat.label.padEnd(18)} ${String(cat.before ?? '—').padStart(3)} → ${String(cat.after ?? '—').padStart(3)}   ${cat.delta === null ? c(ANSI.gray, deltaText) : c(tint, deltaText)}`);
  }
  const improved = moved.filter((m) => m.kind === 'improved');
  const regressed = moved.filter((m) => m.kind === 'regressed');
  if (improved.length || regressed.length) {
    lines.push('');
    const parts = [];
    if (improved.length) parts.push(c(ANSI.green, `${improved.length} check(s) improved`));
    if (regressed.length) parts.push(c(ANSI.red, `${regressed.length} regressed`));
    lines.push('  ' + parts.join('  '));
    for (const m of [...improved, ...regressed].slice(0, 12)) {
      const badge = m.kind === 'improved' ? '✓ fixed' : '✕ slipped';
      lines.push(`    ${c(m.kind === 'improved' ? ANSI.green : ANSI.red, badge.padEnd(10))} ${m.id.padEnd(28)} ${m.before} → ${m.after}`);
    }
    if (moved.length > 12) lines.push(c(ANSI.gray, `    … ${moved.length - 12} more — see report.md for the full list`));
  }
  if (added.length || removed.length) {
    lines.push('');
    lines.push(c(ANSI.gray, `  Check list changed: ${added.length} added, ${removed.length} removed — the tool changed since the baseline scan.`));
    for (const item of added.slice(0, 4)) lines.push(c(ANSI.gray, `    + ${item.id.padEnd(28)} ${item.status}`));
    for (const item of removed.slice(0, 4)) lines.push(c(ANSI.gray, `    − ${item.id.padEnd(28)} ${item.status}`));
  }
  lines.push('');
  return lines.join('\n');
}

export function renderCompareMarkdown(comparison) {
  const { overall, categories, moved, added, removed, baseline } = comparison;
  const lines = [];
  lines.push('## Comparison vs baseline');
  lines.push('');
  lines.push(`**${overall.before}/100 (${overall.beforeGrade}) → ${overall.after}/100 (${overall.afterGrade}) — ${overall.delta > 0 ? '+' : ''}${overall.delta}**`);
  lines.push('');
  if (baseline.url) {
    lines.push(`Baseline: <${baseline.url}>, scanned ${baseline.generatedAt ? new Date(baseline.generatedAt).toISOString() : 'unknown time'}.`);
    lines.push('');
  }
  lines.push('| Category | Before | After | Δ |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const cat of categories) {
    if (cat.before === null && cat.after === null) continue;
    const b = cat.before ?? '—';
    const a = cat.after ?? '—';
    const d = cat.delta === null ? 'n/a' : (cat.delta > 0 ? `+${cat.delta}` : String(cat.delta));
    lines.push(`| ${cat.label} | ${b} | ${a} | ${d} |`);
  }
  lines.push('');
  const improved = moved.filter((m) => m.kind === 'improved');
  const regressed = moved.filter((m) => m.kind === 'regressed');
  if (improved.length) {
    lines.push(`### Fixed (${improved.length})`);
    lines.push('');
    for (const m of improved) lines.push(`- ✅ **${m.title}** \`${m.id}\` — ${m.before} → ${m.after}`);
    lines.push('');
  }
  if (regressed.length) {
    lines.push(`### Regressed (${regressed.length})`);
    lines.push('');
    for (const m of regressed) lines.push(`- ❌ **${m.title}** \`${m.id}\` — ${m.before} → ${m.after}`);
    lines.push('');
  }
  if (!moved.length) {
    lines.push('_No check changed status._');
    lines.push('');
  }
  if (added.length || removed.length) {
    lines.push(`Check list changed: ${added.length} added, ${removed.length} removed (tool version may differ from the baseline scan).`);
    for (const item of added) lines.push(`- + \`${item.id}\` — ${item.status}`);
    for (const item of removed) lines.push(`- − \`${item.id}\` — ${item.status}`);
    lines.push('');
  }
  return lines.join('\n');
}

function htmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function compareSectionHtml(comparison) {
  const { overall, categories, moved, added, removed, baseline } = comparison;
  const improved = moved.filter((m) => m.kind === 'improved');
  const regressed = moved.filter((m) => m.kind === 'regressed');
  const tone = overall.delta >= 0 ? 'var(--green)' : 'var(--red)';
  const rows = categories
    .filter((cat) => cat.before !== null || cat.after !== null)
    .map((cat) => `
      <tr>
        <td>${htmlEscape(cat.label)}</td>
        <td class="num">${cat.before ?? '—'}</td>
        <td class="num">${cat.after ?? '—'}</td>
        <td class="num" style="color:${cat.delta == null ? 'var(--muted)' : cat.delta >= 0 ? 'var(--green)' : 'var(--red)'}">${cat.delta == null ? 'n/a' : (cat.delta > 0 ? `+${cat.delta}` : cat.delta)}</td>
      </tr>`).join('');
  const moves = [...improved, ...regressed].map((m) => `
    <div class="cmp-move ${m.kind === 'improved' ? 'better' : 'worse'}">
      <span class="status">${m.kind === 'improved' ? '✓' : '✕'}</span>
      <div><b>${htmlEscape(m.title)}</b> <code>${htmlEscape(m.id)}</code><br><span class="dim">${m.before} → ${m.after}</span></div>
    </div>`).join('');
  const changeNote = added.length || removed.length
    ? `<p class="fine">Check list also changed: <b>${added.length}</b> added, <b>${removed.length}</b> removed — the tool gained or retired checks since the baseline scan.</p>`
    : '';
  return `
  <section class="cmp-section">
    <div class="section-head">
      <h2>Before → after</h2>
      <p>Delta against a saved <code>report.json</code> baseline.</p>
    </div>
    <div class="cmp-hero">
      <div><span class="grade-old">${htmlEscape(overall.beforeGrade)}</span> ${overall.before}/100</div>
      <div class="cmp-arrow" style="color:${tone}">${arrow(overall.delta, true)} →</div>
      <div><span class="grade-new">${htmlEscape(overall.afterGrade)}</span> ${overall.after}/100</div>
    </div>
    <table class="cmp-table">
      <thead><tr><th>Category</th><th class="num">Before</th><th class="num">After</th><th class="num">Δ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="cmp-list">${moves || '<p class="fine">No check changed status.</p>'}</div>
    <p class="fine">Baseline: <code>${htmlEscape(baseline.url)}</code>, scanned ${htmlEscape(baseline.generatedAt || 'unknown time')}</p>
    ${changeNote}
  </section>`;
}
