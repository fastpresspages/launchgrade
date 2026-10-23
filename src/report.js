import { CATEGORIES } from './checks.js';
import { compactSummary } from './score.js';
import { escapeHtml, hostOf, kb, truncate } from './util.js';

const ANSI = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', lime: '\x1b[38;5;154m', yellow: '\x1b[33m',
  orange: '\x1b[38;5;208m', red: '\x1b[31m', cyan: '\x1b[36m',
  gray: '\x1b[90m', white: '\x1b[97m',
};

function colorEnabled(options = {}) {
  if (options.color === false) return false;
  if (process.env.NO_COLOR) return false;
  return true;
}

function pain(score) {
  if (score >= 90) return ANSI.green;
  if (score >= 80) return ANSI.lime;
  if (score >= 70) return ANSI.yellow;
  if (score >= 60) return ANSI.orange;
  return ANSI.red;
}

function statusStyle(status) {
  if (status === 'pass') return { icon: '✓', color: ANSI.green, label: 'PASS' };
  if (status === 'warn') return { icon: '!', color: ANSI.yellow, label: 'WARN' };
  if (status === 'fail') return { icon: '×', color: ANSI.red, label: 'FAIL' };
  if (status === 'error') return { icon: '×', color: ANSI.red, label: 'ERR' };
  return { icon: 'i', color: ANSI.gray, label: 'INFO' };
}

export function renderTerminal(scored, ctx, options = {}) {
  const color = colorEnabled(options);
  const c = (code, text) => (color ? `${code}${text}${ANSI.reset}` : text);
  const lines = [];
  const host = hostOf(ctx.url);
  lines.push('');
  lines.push(`  ${c(ANSI.lime + ANSI.bold, '▲ LaunchGrade')} ${c(ANSI.gray, `v0.1.0  ·  ${host}`)}`);
  lines.push(c(ANSI.gray, `  ${ctx.url}`));
  const meta = [`Scanned ${new Date(ctx.fetchedAt).toLocaleString()}`, `${ctx.ms} ms`, `${kb(ctx.bytes)} HTML`];
  lines.push(c(ANSI.gray, `  ${meta.join('  ·  ')}`));
  if (ctx.requestedUrl && ctx.requestedUrl !== ctx.url) {
    lines.push(c(ANSI.gray, `  Redirected from ${ctx.requestedUrl}`));
  }
  lines.push('');
  const pad = ' '.repeat(3);
  lines.push(`${pad}${c(ANSI.gray, '┌' + '─'.repeat(46) + '┐')}`);
  lines.push(`${pad}${c(ANSI.gray, '│')}  ${c(pain(scored.score) + ANSI.bold, scored.grade.padEnd(3))} ${c(ANSI.bold + ANSI.white, String(scored.score).padStart(3) + '/100')}   ${c(pain(scored.score), scored.label.padEnd(14))}${c(ANSI.gray, '│')}`);
  lines.push(`${pad}${c(ANSI.gray, '└' + '─'.repeat(46) + '┘')}`);
  const { counts } = scored;
  lines.push(c(ANSI.gray, `  ${scored.scoredChecks} scored checks  ·  `) +
    `${c(ANSI.green, `${counts.pass} pass`)}  ${c(ANSI.yellow, `${counts.warn} warn`)}  ${c(ANSI.red, `${counts.fail + counts.error} fail`)}  ${c(ANSI.gray, `${counts.info} info`)}`);
  lines.push('');

  for (const cat of scored.categories) {
    if (cat.score === null) continue;
    const filled = Math.round((cat.score / 100) * 20);
    const bar = c(pain(cat.score), '█'.repeat(filled)) + c(ANSI.gray, '░'.repeat(20 - filled));
    lines.push(`  ${c(ANSI.white, cat.label.padEnd(18))} ${c(pain(cat.score) + ANSI.bold, String(cat.score).padStart(3))}  ${bar}`);
  }

  if (scored.topFixes.length) {
    lines.push('');
    lines.push(`  ${c(ANSI.bold + ANSI.white, 'Fix these first')}`);
    scored.topFixes.slice(0, options.maxFixes || 7).forEach((fix, i) => {
      const st = statusStyle(fix.status);
      const cat = CATEGORIES[fix.category]?.short || fix.category;
      lines.push(`  ${String(i + 1).padStart(2)}. ${c(st.color, st.label.padEnd(4))} ${c(ANSI.gray, `[${cat}]`)} ${c(ANSI.white, fix.title)}`);
      lines.push(`      ${c(ANSI.gray, truncate(fix.fix || fix.detail, 118))}`);
    });
  }

  lines.push('');
  lines.push(c(ANSI.gray, '  Full HTML report:  ') + c(ANSI.cyan, 'launchgrade ' + host + ' --out reports'));
  lines.push(c(ANSI.gray, '  Share your grade:  ') + c(ANSI.cyan, 'npx launchgrade ' + host));
  lines.push('');
  return lines.join('\n');
}

export function renderMarkdown(scored, ctx) {
  const lines = [];
  lines.push(`# LaunchGrade: ${hostOf(ctx.url)}`);
  lines.push('');
  lines.push(`> **${scored.grade} · ${scored.score}/100 — ${scored.label}**`);
  lines.push('>');
  lines.push(`> \`${ctx.url}\`  `);
  lines.push(`> Scanned ${new Date(ctx.fetchedAt).toUTCString()} · ${ctx.ms} ms · ${kb(ctx.bytes)} HTML`);
  lines.push('');
  lines.push(`**${scored.counts.pass} pass · ${scored.counts.warn} warn · ${scored.counts.fail + scored.counts.error} fail · ${scored.counts.info} info**`);
  lines.push('');
  lines.push('| Category | Score | Weight | Status |');
  lines.push('| --- | ---: | ---: | --- |');
  for (const cat of scored.categories) {
    if (cat.score === null) continue;
    lines.push(`| ${cat.label} | ${cat.score}/100 | ${cat.weight}% | ${cat.counts.pass}✓ ${cat.counts.warn}! ${cat.counts.fail}× |`);
  }
  lines.push('');
  lines.push('## Fix these first');
  lines.push('');
  scored.topFixes.slice(0, 10).forEach((fix, i) => {
    const badge = fix.status === 'fail' || fix.status === 'error' ? '❌' : '⚠️';
    lines.push(`${i + 1}. ${badge} **${fix.title}** (${CATEGORIES[fix.category]?.label || fix.category})`);
    lines.push(`   - ${fix.detail}`);
    if (fix.fix) lines.push(`   - **Fix:** ${fix.fix}`);
  });
  lines.push('');
  lines.push('<details>');
  lines.push(`<summary>All ${scored.results.length} checks</summary>`);
  lines.push('');
  for (const [key, meta] of Object.entries(CATEGORIES)) {
    const checks = scored.results.filter((r) => r.category === key);
    if (!checks.length) continue;
    lines.push(`### ${meta.label}`);
    lines.push('');
    for (const check of checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : check.status === 'fail' || check.status === 'error' ? '❌' : 'ℹ️';
      lines.push(`- ${icon} **${check.title}** — ${check.detail}`);
      if ((check.status === 'warn' || check.status === 'fail' || check.status === 'error') && check.fix) lines.push(`  - *Fix:* ${check.fix}`);
    }
    lines.push('');
  }
  lines.push('</details>');
  lines.push('');
  lines.push('---');
  lines.push('Generated by [LaunchGrade](https://github.com/fastpresspages/launchgrade) — the open-source launch audit. Zero dependencies.');
  return lines.join('\n');
}

export function toJson(scored, ctx) {
  return JSON.stringify({
    tool: 'launchgrade',
    version: '0.1.0',
    generatedAt: new Date().toISOString(),
    url: ctx.url,
    requestedUrl: ctx.requestedUrl,
    httpStatus: ctx.status,
    responseMs: ctx.ms,
    htmlBytes: ctx.bytes,
    ...compactSummary(scored, ctx.url),
    categories: scored.categories.map((c) => ({
      key: c.key, label: c.label, short: c.short, score: c.score, weight: c.weight,
      counts: c.counts,
    })),
    checks: scored.results.map((r) => ({
      id: r.id, category: r.category, title: r.title, status: r.status, weight: r.weight,
      detail: r.detail, fix: r.fix,
    })),
  }, null, 2);
}

function icon(status) {
  if (status === 'pass') return '✓';
  if (status === 'warn') return '!';
  if (status === 'fail' || status === 'error') return '×';
  if (status === 'skipped') return '–';
  return 'i';
}

function cssStatus(status) {
  if (status === 'pass') return 'pass';
  if (status === 'warn') return 'warn';
  if (status === 'fail' || status === 'error') return 'fail';
  if (status === 'skipped') return 'skip';
  return 'info';
}

export function renderHtml(scored, ctx) {
  const host = hostOf(ctx.url);
  const date = new Date(ctx.fetchedAt);
  const share = encodeURIComponent(`My launch page scored ${scored.grade} (${scored.score}/100) on LaunchGrade.\n\nGrade yours in 60 seconds:`);
  const cats = scored.categories.filter((c) => c.score !== null);
  const allChecks = Object.entries(CATEGORIES).map(([key, meta]) => {
    const checks = scored.results.filter((r) => r.category === key);
    if (!checks.length) return '';
    return `
      <section class="check-group">
        <div class="group-head">
          <h3>${escapeHtml(meta.label)}</h3>
          <span>${meta.weight}% of grade</span>
        </div>
        <div class="check-list">
          ${checks.map((c) => `
            <article class="check ${cssStatus(c.status)}">
              <span class="status" aria-label="${c.status}">${icon(c.status)}</span>
              <div>
                <h4>${escapeHtml(c.title)} <code>${escapeHtml(c.id)}</code></h4>
                <p>${escapeHtml(c.detail)}</p>
                ${c.fix && ['warn', 'fail', 'error'].includes(c.status) ? `<p class="fix"><b>Fix:</b> ${escapeHtml(c.fix)}</p>` : ''}
              </div>
            </article>`).join('')}
        </div>
      </section>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(host)} — LaunchGrade ${escapeHtml(scored.grade)} (${scored.score}/100)</title>
<meta name="description" content="LaunchGrade report for ${escapeHtml(host)}: ${scored.grade}, ${scored.score}/100. Conversion, trust, SEO, social, accessibility and AI-agent readiness.">
<meta property="og:title" content="${escapeHtml(host)} scored ${escapeHtml(scored.grade)} on LaunchGrade">
<meta property="og:description" content="${scored.score}/100 — ${escapeHtml(scored.label)}. See every check and the exact fixes.">
<meta name="twitter:card" content="summary_large_image">
<style>
  :root {
    --bg: #08080a; --panel: #101014; --panel2: #15151b; --line: #24242e;
    --text: #f4f4f5; --muted: #9a9aa8; --dim: #6b6b78;
    --lime: #c6ff4a; --green: #3ddc84; --yellow: #ffb020; --orange: #ff7a45; --red: #ff5c5c;
    --violet: #a78bfa;
    --radius: 16px;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.5; -webkit-font-smoothing: antialiased;
  }
  a { color: var(--lime); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .wrap { width: min(1080px, calc(100% - 40px)); margin: 0 auto; }
  header { padding: 28px 0 10px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; letter-spacing: -.02em; }
  .mark { width: 30px; height: 30px; border-radius: 9px; background: var(--lime); color: #060608; display: grid; place-items: center; font-weight: 900; }
  .brand span { color: var(--muted); font-weight: 500; font-size: 14px; }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 10px 15px; border-radius: 999px;
    border: 1px solid var(--line); background: var(--panel); color: var(--text); font-size: 14px; font-weight: 600;
  }
  .btn.primary { background: var(--lime); color: #060608; border-color: var(--lime); }
  .btn:hover { text-decoration: none; border-color: #3a3a48; }
  .hero { margin-top: 26px; border: 1px solid var(--line); background: radial-gradient(1200px 400px at 10% -20%, #1c2410 0%, transparent 60%), var(--panel); border-radius: 24px; overflow: hidden; }
  .hero-top { display: grid; grid-template-columns: 1.5fr .9fr; gap: 0; }
  .hero-copy { padding: 38px 38px 30px; }
  .eyebrow { color: var(--lime); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; text-transform: uppercase; letter-spacing: .14em; }
  h1 { font-size: clamp(30px, 5vw, 52px); line-height: 1.03; letter-spacing: -.045em; margin: 12px 0 14px; }
  h1 em { font-style: normal; color: var(--lime); }
  .url { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; color: var(--muted); word-break: break-all; }
  .meta { color: var(--dim); font-size: 13px; margin-top: 6px; }
  .hero-score { padding: 30px; display: grid; place-items: center; border-left: 1px solid var(--line); background: #0c0c10; }
  .ring { --pct: 0; --color: var(--green); width: 176px; height: 176px; border-radius: 50%; background: conic-gradient(var(--color) calc(var(--pct) * 1%), #1e1e26 0); display: grid; place-items: center; position: relative; }
  .ring::after { content: ""; position: absolute; inset: 10px; border-radius: 50%; background: #0c0c10; }
  .ring-inner { position: relative; z-index: 1; text-align: center; }
  .grade { font-size: 56px; font-weight: 900; letter-spacing: -.06em; line-height: 1; color: var(--color); }
  .outof { font-size: 13px; color: var(--muted); margin-top: 4px; }
  .label { color: var(--text); font-weight: 700; margin-top: 10px; font-size: 15px; }
  .stats { display: flex; gap: 16px; flex-wrap: wrap; padding: 16px 38px; border-top: 1px solid var(--line); background: #0c0c10; color: var(--muted); font-size: 13px; }
  .stats b { color: var(--text); }
  .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; margin-right: 6px; }
  main { padding: 26px 0 60px; }
  .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin: 0 0 26px; }
  .cat { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 14px 12px; }
  .cat .n { font-size: 22px; font-weight: 800; letter-spacing: -.03em; }
  .cat .k { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; margin-top: 2px; }
  .bar { height: 5px; border-radius: 99px; background: #22222c; margin-top: 10px; overflow: hidden; }
  .bar i { display: block; height: 100%; border-radius: 99px; }
  .section-head { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin: 34px 0 14px; flex-wrap: wrap; }
  .section-head h2 { font-size: 24px; letter-spacing: -.03em; margin: 0; }
  .section-head p { margin: 0; color: var(--muted); font-size: 14px; }
  .fixes { display: grid; gap: 10px; }
  .fix { display: grid; grid-template-columns: 34px 1fr; gap: 14px; border: 1px solid var(--line); background: var(--panel); border-radius: 14px; padding: 16px; }
  .fix .num { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 13px; }
  .fix.fail .num { background: rgba(255,92,92,.14); color: var(--red); }
  .fix.warn .num { background: rgba(255,176,32,.14); color: var(--yellow); }
  .fix h3 { margin: 0 0 3px; font-size: 15px; }
  .fix p { margin: 4px 0 0; color: var(--muted); font-size: 14px; }
  .fix .do { color: var(--text); }
  .tag { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--dim); border: 1px solid var(--line); border-radius: 999px; padding: 2px 8px; margin-left: 8px; white-space: nowrap; }
  .check-group { border-top: 1px solid var(--line); padding-top: 18px; margin-top: 26px; }
  .group-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .group-head h3 { margin: 0; font-size: 18px; letter-spacing: -.02em; }
  .group-head span { color: var(--dim); font-size: 12px; }
  .check-list { display: grid; gap: 2px; margin-top: 10px; }
  .check { display: grid; grid-template-columns: 26px 1fr; gap: 10px; padding: 11px 12px; border-radius: 10px; }
  .check:hover { background: var(--panel); }
  .check .status { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 800; margin-top: 1px; }
  .check.pass .status { background: rgba(61,220,132,.14); color: var(--green); }
  .check.warn .status { background: rgba(255,176,32,.14); color: var(--yellow); }
  .check.fail .status { background: rgba(255,92,92,.14); color: var(--red); }
  .check.info .status { background: rgba(154,154,168,.14); color: var(--muted); }
  .check.skip .status { background: #1a1a22; color: var(--dim); }
  .check h4 { margin: 0; font-size: 14px; font-weight: 600; }
  .check h4 code { font-size: 10px; color: var(--dim); font-weight: 400; margin-left: 6px; }
  .check p { margin: 3px 0 0; color: var(--muted); font-size: 13px; }
  .check .fix { display: block; border: 0; background: none; padding: 0; margin-top: 5px; color: var(--text); font-size: 13px; grid-template-columns: none; }
  footer { border-top: 1px solid var(--line); padding: 30px 0 50px; color: var(--muted); font-size: 14px; }
  footer .wrap { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
  footer code { color: var(--lime); background: #141419; padding: 3px 7px; border-radius: 6px; }
  .fine { color: var(--dim); font-size: 12px; max-width: 620px; margin-top: 10px; }
  @media (max-width: 860px) {
    .hero-top { grid-template-columns: 1fr; }
    .hero-score { border-left: 0; border-top: 1px solid var(--line); }
    .grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 520px) {
    .wrap { width: min(100% - 24px, 1080px); }
    .hero-copy { padding: 26px 22px; }
    .grid { grid-template-columns: repeat(2, 1fr); }
    .stats { padding: 14px 22px; }
    .check { grid-template-columns: 22px 1fr; padding: 10px 4px; }
  }
  @media print {
    body { background: #fff; color: #111; }
    .hero, .cat, .fix, .check-group { break-inside: avoid; }
    .actions { display: none; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <a class="brand" href="https://github.com/fastpresspages/launchgrade">
      <span class="mark">LG</span> LaunchGrade <span>open-source launch audit</span>
    </a>
    <div class="actions">
      <a class="btn" href="https://twitter.com/intent/tweet?text=${share}&url=${encodeURIComponent(ctx.url)}" target="_blank" rel="noopener">Share score</a>
      <a class="btn primary" href="https://fastpresspages.github.io/launchgrade/">Grade your page →</a>
    </div>
  </header>

  <section class="hero">
    <div class="hero-top">
      <div class="hero-copy">
        <div class="eyebrow">Launch audit · ${date.toISOString().slice(0, 10)}</div>
        <h1>${escapeHtml(host)} scored <em>${escapeHtml(scored.grade)}</em>.</h1>
        <div class="url">${escapeHtml(ctx.url)}</div>
        <div class="meta">${ctx.ms} ms · ${kb(ctx.bytes)} HTML · HTTP ${ctx.status} · ${scored.scoredChecks} scored checks</div>
      </div>
      <div class="hero-score">
        <div class="ring" style="--pct:${scored.score};--color:${scored.color}">
          <div class="ring-inner">
            <div class="grade">${escapeHtml(scored.grade)}</div>
            <div class="outof">${scored.score} / 100</div>
            <div class="label">${escapeHtml(scored.label)}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="stats">
      <span><span class="dot" style="background:var(--green)"></span><b>${scored.counts.pass}</b> passed</span>
      <span><span class="dot" style="background:var(--yellow)"></span><b>${scored.counts.warn}</b> warnings</span>
      <span><span class="dot" style="background:var(--red)"></span><b>${scored.counts.fail + scored.counts.error}</b> failed</span>
      <span><span class="dot" style="background:var(--muted)"></span><b>${scored.counts.info}</b> informational</span>
    </div>
  </section>

  <main>
    <div class="grid">
      ${cats.map((cat) => `
        <div class="cat">
          <div class="n" style="color:${scoreColor(cat.score)}">${cat.score}</div>
          <div class="k">${escapeHtml(cat.short)}</div>
          <div class="bar"><i style="width:${cat.score}%;background:${scoreColor(cat.score)}"></i></div>
        </div>`).join('')}
    </div>

    <div class="section-head">
      <h2>Fix these first</h2>
      <p>Ordered by impact on the grade. Each fix is specific enough to hand to a builder.</p>
    </div>
    <div class="fixes">
      ${scored.topFixes.slice(0, 8).map((f, i) => `
        <article class="fix ${f.status === 'fail' || f.status === 'error' ? 'fail' : 'warn'}">
          <div class="num">${i + 1}</div>
          <div>
            <h3>${escapeHtml(f.title)}<span class="tag">${escapeHtml(CATEGORIES[f.category]?.label || f.category)}</span><span class="tag">${escapeHtml(f.id)}</span></h3>
            <p>${escapeHtml(f.detail)}</p>
            ${f.fix ? `<p class="do"><b>Fix:</b> ${escapeHtml(f.fix)}</p>` : ''}
          </div>
        </article>`).join('') || '<p>No blocking issues found. Ship it.</p>'}
    </div>

    <div class="section-head" id="all">
      <h2>Every check</h2>
      <p>Transcript of all ${scored.results.length} checks, including informational ones.</p>
    </div>
    ${allChecks}
  </main>

  <footer>
    <div class="wrap">
      <div>
        <strong>Generated by LaunchGrade</strong> — the open-source launch audit.<br>
        Run it yourself: <code>npx launchgrade ${escapeHtml(host)}</code>
        <p class="fine">Scores are heuristics based on the public HTML and well-known files at scan time. They are not a guarantee of revenue, ranking or accessibility compliance. Re-scan after changes; the internet is not static.</p>
      </div>
      <div>
        <a href="https://github.com/fastpresspages/launchgrade">GitHub</a> ·
        <a href="https://fastpresspages.github.io/launchgrade/">Website</a> ·
        <a href="https://github.com/fastpresspages/launchgrade/issues">Report an issue</a>
      </div>
    </div>
  </footer>
</div>
</body>
</html>`;
}

function scoreColor(score) {
  if (score >= 90) return '#3ddc84';
  if (score >= 80) return '#c6ff4a';
  if (score >= 70) return '#ffb020';
  if (score >= 60) return '#ff7a45';
  return '#ff5c5c';
}

export function renderBadge(scored, { label = 'launchgrade' } = {}) {
  const grade = scored.grade;
  const color = scored.color;
  const left = Math.max(88, label.length * 7 + 18);
  const width = left + 92;
  const text = `${grade} ${scored.score}/100`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="28" role="img" aria-label="${escapeHtml(label)}: ${escapeHtml(text)}">
  <title>${escapeHtml(label)}: ${escapeHtml(text)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".07"/>
    <stop offset="1" stop-opacity=".07"/>
  </linearGradient>
  <rect width="${width}" height="28" rx="6" fill="#0b0b0f"/>
  <rect x="${left}" width="${width - left}" height="28" fill="${color}"/>
  <rect width="${width}" height="28" rx="6" fill="url(#s)"/>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" font-weight="700">
    <text x="${left / 2}" y="18" fill="#c6ff4a">${escapeHtml(label)}</text>
    <text x="${left + (width - left) / 2}" y="18" fill="#08080a">${escapeHtml(text)}</text>
  </g>
</svg>`;
}

export function renderFixPlan(scored, ctx) {
  const lines = [];
  lines.push(`# Fix plan for ${hostOf(ctx.url)}`);
  lines.push('');
  lines.push(`Current grade: **${scored.grade} (${scored.score}/100)**. Target: **A (90+)**.`);
  lines.push('');
  lines.push('Work top to bottom. Re-run `launchgrade` after each batch and keep the report in the repo so the grade is visible.');
  lines.push('');
  scored.topFixes.slice(0, 12).forEach((f, i) => {
    lines.push(`## ${i + 1}. ${f.title}`);
    lines.push('');
    lines.push(`- **Why:** ${f.detail}`);
    lines.push(`- **Fix:** ${f.fix || 'Review the check and improve the page.'}`);
    lines.push(`- **Check:** \`${f.id}\` (${CATEGORIES[f.category]?.label || f.category})`);
    lines.push('');
  });
  return lines.join('\n');
}
