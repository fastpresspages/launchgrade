import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { attrs, meta, forms, headings, cleanText } from '../src/util.js';
import { runChecks, isBlocked, CHECKS } from '../src/checks.js';
import { scoreResults } from '../src/score.js';
import { buildContextFromHtml, audit } from '../src/index.js';
import { renderHtml, renderMarkdown, renderBadge, toJson } from '../src/report.js';
import { compareResults, renderCompareTerminal, renderCompareMarkdown, compareSectionHtml, loadBaseline } from '../src/compare.js';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleRequest } from '../mcp/server.js';

const COPY = `Launch pages fail for boring reasons. The headline is clever but says nothing. The button says learn more and asks for nothing. The email form asks for six fields, the privacy page does not exist, and the share card is a blank rectangle. We grade all of it in about sixty seconds so you can fix the expensive mistakes before you announce. Every check is public, every score explains itself, and every fix is specific enough to hand to a builder. Run it before launch, after a redesign, and every time you change the offer. A launch is not a one-day event. It is a sequence of small promises kept in public, and the page is where most of those promises are made.`;

const GOOD_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>LaunchGrade — Grade your launch page in 60 seconds</title>
  <meta name="description" content="The open-source launch audit for founders. Grade conversion, trust, SEO, social, accessibility and AI-agent readiness before you announce.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://example.com/">
  <link rel="icon" href="/favicon.ico">
  <meta property="og:title" content="LaunchGrade — grade your launch">
  <meta property="og:description" content="Find the expensive mistakes before your launch does.">
  <meta property="og:image" content="https://example.com/og.png">
  <meta property="og:url" content="https://example.com/">
  <meta property="og:image:alt" content="A launch report card showing an A grade">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://example.com/og.png">
  <meta name="twitter:title" content="LaunchGrade">
  <meta name="twitter:description" content="Grade your launch page in 60 seconds.">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":["Organization","FAQPage"],"name":"LaunchGrade","mainEntity":[{"@type":"Question","name":"Is it free?","acceptedAnswer":{"@type":"Answer","text":"Yes."}}]}
  </script>
  <script src="https://plausible.io/js/script.js" defer></script>
</head>
<body>
  <a href="#main">Skip to content</a>
  <nav><a href="/">Home</a><a href="/pricing">Pricing</a><a href="/about">About</a></nav>
  <main id="main">
    <article>
      <h1>Grade your launch before the internet does</h1>
      <p>${COPY}</p>
      <h2>Every check, explained</h2>
      <p>${COPY}</p>
      <h2>Frequently asked questions</h2>
      <h3>Is it free?</h3>
      <p>Yes. The CLI is open source and the audit is free.</p>
      <h3>How long does it take?</h3>
      <p>About sixty seconds for a normal page.</p>
      <img src="https://example.com/report.png" alt="A sample LaunchGrade report">
      <img src="https://example.com/logo.png" alt="LaunchGrade logo">
      <form action="https://formsubmit.co/hello@example.com" method="post">
        <label for="email">Email</label>
        <input id="email" type="email" name="email" placeholder="you@example.com" required>
        <button type="submit">Get my free audit</button>
      </form>
      <p>Trusted by 100 founders. ★★★★★ No spam. Free forever.</p>
      <a href="mailto:hello@example.com">Email us</a>
      <a href="https://github.com/fastpresspages">GitHub</a>
    </article>
  </main>
  <footer>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
    <a href="/about">About the team</a>
    <p>© 2026 LaunchGrade. All rights reserved.</p>
  </footer>
</body>
</html>`;

const GOOD_EXTRAS = {
  robots: { ok: true, status: 200, url: 'https://example.com/robots.txt', body: 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n', contentType: 'text/plain' },
  sitemap: { ok: true, status: 200, url: 'https://example.com/sitemap.xml', body: '<urlset><url><loc>https://example.com/</loc></url></urlset>', contentType: 'application/xml' },
  llms: { ok: true, status: 200, url: 'https://example.com/llms.txt', body: '# LaunchGrade\n\n> The open-source launch audit.\n\n## Docs\n- [Checks](https://example.com/checks)\n', contentType: 'text/plain' },
  llmsFull: { ok: true, status: 200, url: 'https://example.com/llms-full.txt', body: '# LaunchGrade\n\nFull docs for agents. '.repeat(10), contentType: 'text/plain' },
  security: { ok: true, status: 200, url: 'https://example.com/.well-known/security.txt', body: 'Contact: mailto:security@example.com\nExpires: 2027-01-01T00:00:00.000Z\n', contentType: 'text/plain' },
  agents: { ok: true, status: 200, url: 'https://example.com/agents.md', body: '# Agent guide\n\nRun the CLI with --json.', contentType: 'text/markdown' },
  agentsUpper: { ok: false, status: 404, url: 'https://example.com/AGENTS.md', body: '', contentType: '' },
  mcp: { ok: true, status: 200, url: 'https://example.com/.well-known/mcp.json', body: '{"name":"launchgrade"}', contentType: 'application/json' },
  openapi: { ok: false, status: 404, url: 'https://example.com/.well-known/openapi.json', body: '', contentType: '' },
  markdown: { ok: true, status: 200, contentType: 'text/markdown; charset=utf-8', markdown: true, vary: 'Accept' },
};

function goodContext() {
  return buildContextFromHtml({
    html: GOOD_HTML,
    url: 'https://example.com/',
    headers: { 'content-encoding': 'br', 'cache-control': 'public, max-age=60', 'content-type': 'text/html' },
    extras: GOOD_EXTRAS,
  });
}

function statusMap(scored) {
  return Object.fromEntries(scored.results.map((r) => [r.id, r.status]));
}

test('attribute parser handles quoted, unquoted and boolean attributes', () => {
  const a = attrs('<meta name="viewport" content=\'width=device-width\' data-x=1 required>');
  assert.equal(a.name, 'viewport');
  assert.equal(a.content, 'width=device-width');
  assert.equal(a['data-x'], '1');
  assert.equal(a.required, '');
});

test('meta, forms and headings are extracted without a DOM', () => {
  assert.equal(meta('<meta property="og:title" content="Hi"><meta name="description" content="There">')['og:title'], 'Hi');
  const f = forms('<form action="/go"><input type="email" name="email"><label for="x">X</label><button type="submit">Join</button></form>');
  assert.equal(f.length, 1);
  assert.equal(f[0].action, '/go');
  assert.equal(f[0].inputs[0].type, 'email');
  assert.equal(f[0].buttons[0].text, 'Join');
  assert.deepEqual(headings('<h1>One</h1><h2>Two <em>em</em></h2>'), [{ level: 1, text: 'One' }, { level: 2, text: 'Two em' }]);
  assert.equal(cleanText('<p>Hello&nbsp;<b>world</b></p>'), 'Hello world');
});

test('image dimensions check passes when images have valid dimensions', () => {
  const html = `
    <html lang="en">
      <head>
        <title>Test launch page</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <img src="/logo.png" width="200" height="100" alt="Logo">
        <img src="/hero.png" width="1200" height="600" alt="Hero">
      </body>
    </html>
  `;

  const ctx = buildContextFromHtml({
    html,
    url: 'https://example.com/',
  });

  const check = runChecks(ctx).find(
    (item) => item.id === 'tech.image-dimensions'
  );

  assert.equal(check.status, 'pass');
  assert.match(check.detail, /All 2 images/);
});

test('image dimensions check warns when dimensions are missing or invalid', () => {
  const html = `
    <html lang="en">
      <head>
        <title>Test launch page</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <img src="/logo.png" alt="Logo">
        <img src="/hero.png" width="1200" alt="Hero">
        <img src="/banner.png" width="0" height="100" alt="Banner">
      </body>
    </html>
  `;

  const ctx = buildContextFromHtml({
    html,
    url: 'https://example.com/',
  });

  const check = runChecks(ctx).find(
    (item) => item.id === 'tech.image-dimensions'
  );

  assert.equal(check.status, 'warn');
  assert.match(check.detail, /3\/3 images/);
});

test('image dimensions check reports info when no images exist', () => {
  const ctx = buildContextFromHtml({
    html: '<html><head><title>Test launch page</title></head><body><p>Hello</p></body></html>',
    url: 'https://example.com/',
  });

  const check = runChecks(ctx).find(
    (item) => item.id === 'tech.image-dimensions'
  );

  assert.equal(check.status, 'info');
  assert.match(check.detail, /No images/);
});
test('a complete launch page earns an A', () => {
  const scored = scoreResults(runChecks(goodContext()));
  assert.ok(scored.score >= 90, `expected A, got ${scored.grade} (${scored.score})`);
  assert.equal(scored.grade.startsWith('A'), true);
  const statuses = statusMap(scored);
  for (const id of ['conv.email-capture', 'conv.cta', 'tech.https', 'seo.title', 'social.open-graph', 'a11y.form-labels', 'agent.llms-txt', 'agent.robots-ai', 'agent.no-js-copy']) {
    assert.equal(statuses[id], 'pass', `${id} should pass but was ${statuses[id]}: ${scored.results.find((r) => r.id === id)?.detail}`);
  }
});

test('a bare launch page fails the important checks', () => {
  const ctx = buildContextFromHtml({ html: '<html><body><h1>Hi</h1><p>Coming soon.</p></body></html>', url: 'http://example.com/' });
  const scored = scoreResults(runChecks(ctx));
  assert.ok(scored.score < 40, `expected a low score, got ${scored.grade} (${scored.score})`);
  assert.equal(scored.grade, 'F');
  const statuses = statusMap(scored);
  assert.equal(statuses['tech.https'], 'fail');
  assert.equal(statuses['conv.email-capture'], 'fail');
  assert.equal(statuses['seo.description'], 'fail');
  assert.equal(statuses['social.open-graph'], 'fail');
  assert.equal(statuses['agent.llms-txt'], 'fail');
  assert.equal(statuses['a11y.landmarks'], 'fail');
});

test('ignored checks are skipped and do not affect the score', () => {
  const ctx = buildContextFromHtml({ html: GOOD_HTML, url: 'https://example.com/', headers: { 'content-encoding': 'br' }, extras: GOOD_EXTRAS });
  const base = scoreResults(runChecks(ctx));
  const ignored = scoreResults(runChecks(ctx, { ignore: ['agent.llms-txt'] }));
  assert.equal(ignored.results.find((r) => r.id === 'agent.llms-txt').status, 'skipped');
  assert.ok(ignored.score >= base.score - 1);
  assert.ok(ignored.categories.find((c) => c.key === 'agent').possible < base.categories.find((c) => c.key === 'agent').possible);
});

test('robots parser respects specific bot groups and wildcard groups', () => {
  const robots = `User-agent: *
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Disallow: /`;
  assert.equal(isBlocked(robots, 'GPTBot'), true);
  assert.equal(isBlocked(robots, 'ClaudeBot'), false);
  assert.equal(isBlocked(robots, 'PerplexityBot'), true);
  assert.equal(isBlocked(robots, 'SomeOtherBot'), false);
});

test('every check has a unique id, a known category and a positive weight', () => {
  const ids = new Set();
  for (const check of CHECKS) {
    assert.ok(!ids.has(check.id), `duplicate ${check.id}`);
    ids.add(check.id);
    assert.ok(['conversion', 'trust', 'technical', 'seo', 'social', 'a11y', 'agent'].includes(check.category));
    assert.ok(check.weight >= 1 && check.weight <= 3);
    assert.ok(check.title.length > 3);
  }
  assert.ok(CHECKS.length >= 45);
});

test('reports render grade, URL and an SVG badge', () => {
  const ctx = goodContext();
  const scored = scoreResults(runChecks(ctx));
  const html = renderHtml(scored, ctx);
  assert.match(html, /LaunchGrade/);
  assert.match(html, /https:\/\/example\.com\//);
  assert.match(html, new RegExp(`<div class="grade">${scored.grade.replace(/\+/g, '\\+')}</div>`));
  assert.match(html, /<!doctype html>/i);
  const md = renderMarkdown(scored, ctx);
  assert.match(md, new RegExp(`${scored.score}/100`));
  assert.match(md, /Fix these first|LaunchGrade/);
  const svg = renderBadge(scored);
  assert.match(svg, /^<svg/);
  assert.match(svg, new RegExp(scored.grade));
  const json = JSON.parse(toJson(scored, ctx));
  assert.equal(json.score, scored.score);
  assert.ok(Array.isArray(json.checks));
});

test('MCP server initializes, lists tools and grades via the tool contract', async () => {
  const init = await handleRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } });
  assert.equal(init.protocolVersion, '2025-03-26');
  assert.equal(init.serverInfo.name, 'launchgrade');
  const list = await handleRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.ok(list.tools.some((t) => t.name === 'grade_launch'));
  const checks = await handleRequest({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_checks', arguments: {} } });
  assert.equal(checks.isError, false);
  assert.match(checks.content[0].text, /Conversion/);
  const unknown = await handleRequest({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope' } });
  assert.equal(unknown.isError, true);
});

test('well-known files resolve inside a project page path', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/launchgrade/' || req.url === '/launchgrade/index.html') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(GOOD_HTML);
      return;
    }
    if (req.url === '/launchgrade/robots.txt') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('User-agent: *\nAllow: /\n');
      return;
    }
    if (req.url === '/launchgrade/llms.txt') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('# LaunchGrade\n\n> A launch page grader.\n');
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try {
    const { ctx } = await audit(`http://127.0.0.1:${port}/launchgrade/`, { timeout: 5000 });
    assert.equal(ctx.extras.robots.status, 200);
    assert.match(ctx.extras.robots.url, /\/launchgrade\/robots\.txt$/);
    assert.equal(ctx.extras.llms.status, 200);
    assert.match(ctx.extras.llms.url, /\/launchgrade\/llms\.txt$/);
    assert.equal(ctx.extras.sitemap.status, 404);
  } finally {
    server.close();
  }
});

test('audit fetches a real local page and its missing well-known files', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(GOOD_HTML);
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try {
    const { ctx, scored } = await audit(`http://127.0.0.1:${port}/`, { timeout: 5000 });
    assert.equal(ctx.status, 200);
    assert.equal(ctx.html.includes('LaunchGrade'), true);
    assert.equal(scored.results.length, CHECKS.length);
    assert.equal(scored.results.find((r) => r.id === 'tech.https').status, 'fail');
    assert.equal(scored.results.find((r) => r.id === 'agent.llms-txt').status, 'fail');
  } finally {
    server.close();
  }
});

/* ---------- compare mode ---------- */

function asReport({ ctx, scored }, generatedAt = '2026-10-24T00:00:00.000Z') {
  return {
    tool: 'launchgrade',
    version: '0.2.0',
    generatedAt,
    url: ctx.url,
    grade: scored.grade,
    score: scored.score,
    label: scored.label,
    counts: {
      pass: scored.counts.pass, warn: scored.counts.warn, fail: scored.counts.fail,
      error: scored.counts.error, info: scored.counts.info,
    },
    categories: scored.categories.map((c) => ({ key: c.key, label: c.label, short: c.short, score: c.score, weight: c.weight, counts: c.counts })),
    checks: scored.results.map((r) => ({ id: r.id, category: r.category, title: r.title, status: r.status, weight: r.weight, detail: r.detail, fix: r.fix })),
  };
}

const BASELINE = {
  tool: 'launchgrade', version: '0.1.0', generatedAt: '2026-10-01T00:00:00.000Z',
  url: 'https://example.com/', grade: 'B-', score: 71, label: 'Needs polish',
  counts: { pass: 30, warn: 5, fail: 10, error: 0, info: 8 },
  categories: [
    { key: 'conversion', label: 'Conversion', short: 'Convert', score: 80, weight: 25, counts: { pass: 3, warn: 2, fail: 2 } },
    { key: 'trust', label: 'Trust', short: 'Trust', score: 50, weight: 15, counts: { pass: 2, warn: 1, fail: 2 } },
  ],
  checks: [
    { id: 'conv.email-capture', category: 'conversion', title: 'Email capture', status: 'pass' },
    { id: 'trust.privacy', category: 'trust', title: 'Privacy', status: 'fail' },
    { id: 'trust.terms', category: 'trust', title: 'Terms', status: 'warn' },
    { id: 'seo.title', category: 'seo', title: 'Title', status: 'warn' },
  ],
};

const CURRENT_FIXES = {
  tool: 'launchgrade', version: '0.2.0', generatedAt: '2026-10-24T00:00:00.000Z',
  url: 'https://example.com/', grade: 'A', score: 90, label: 'Launch-ready',
  counts: { pass: 40, warn: 3, fail: 2, error: 0, info: 8 },
  categories: [
    { key: 'conversion', label: 'Conversion', short: 'Convert', score: 100, weight: 25, counts: { pass: 7, warn: 0, fail: 0 } },
    { key: 'trust', label: 'Trust', short: 'Trust', score: 60, weight: 15, counts: { pass: 4, warn: 1, fail: 0 } },
  ],
  checks: [
    { id: 'conv.email-capture', category: 'conversion', title: 'Email capture', status: 'pass' },
    { id: 'trust.privacy', category: 'trust', title: 'Privacy', status: 'pass' },
    { id: 'trust.terms', category: 'trust', title: 'Terms', status: 'warn' },
    { id: 'seo.title', category: 'seo', title: 'Title', status: 'fail' },
    { id: 'agent.llms-txt', category: 'agent', title: 'llms.txt', status: 'fail' },
  ],
};

test('compareResults classifies improvements, regressions, added and removed checks', () => {
  const cmp = compareResults(BASELINE, CURRENT_FIXES);
  assert.deepEqual(cmp.overall, {
    before: 71, after: 90, delta: 19,
    beforeGrade: 'B-', afterGrade: 'A',
    beforeLabel: 'Needs polish', afterLabel: 'Launch-ready',
  });
  const moved = Object.fromEntries(cmp.moved.map((m) => [m.id, m]));
  assert.equal(moved['trust.privacy'].kind, 'improved');
  assert.equal(moved['trust.privacy'].before, 'fail');
  assert.equal(moved['trust.privacy'].after, 'pass');
  assert.equal(moved['seo.title'].kind, 'regressed');
  assert.equal(moved['seo.title'].before, 'warn');
  assert.equal(moved['seo.title'].after, 'fail');
  assert.equal(cmp.moved.find((m) => m.id === 'trust.terms'), undefined);
  assert.deepEqual(cmp.added.map((a) => a.id), ['agent.llms-txt']);
  assert.deepEqual(cmp.removed.map((a) => a.id), []); // every baseline id exists in current in this fixture
  const conv = cmp.categories.find((c) => c.key === 'conversion');
  assert.deepEqual(conv, { key: 'conversion', label: 'Conversion', before: 80, after: 100, delta: 20 });
  assert.equal(cmp.countsDelta.pass, 10);
  assert.equal(cmp.countsDelta.fail, -8);
});

test('renderers and toJson carry the comparison', () => {
  const cmp = compareResults(BASELINE, CURRENT_FIXES);
  const md = renderCompareMarkdown(cmp);
  assert.match(md, /## Comparison vs baseline/);
  assert.match(md, /71\/100 \(B-\) → 90\/100 \(A\) — \+19/);
  assert.match(md, /### Fixed \(1\)/);
  assert.match(md, /### Regressed \(1\)/);
  assert.match(md, /Check list changed: 1 added/);
  const term = renderCompareTerminal(cmp);
  assert.match(term, /Compare/);
  assert.match(term, /▲ \+19/);
  assert.match(term, /1 check\(s\) improved/);
  assert.match(term, /1 regressed/);
  assert.match(term, /agent\.llms-txt/);
  const patched = { ...BASELINE, checks: BASELINE.checks.filter((c) => c.id !== 'seo.title') };
  assert.match(renderCompareTerminal(compareResults(patched, CURRENT_FIXES)), /removed/);
  const section = compareSectionHtml(cmp);
  assert.match(section, /cmp-section/);
  assert.match(section, /grade-old/);
  assert.match(section, /Before → after/);

  const scored = {
    score: 90, grade: 'A', label: 'Launch-ready', color: '#3ddc84',
    counts: { pass: 40, warn: 3, fail: 0, error: 0, info: 8, skipped: 2, total: 53 },
    categories: CURRENT_FIXES.categories,
    topFixes: [], results: [], scoredChecks: 43,
  };
  const ctx = { url: 'https://example.com/', fetchedAt: '2026-10-24T00:00:00.000Z', ms: 200, bytes: 5000 };
  const reportMd = renderMarkdown(scored, ctx, { comparison: cmp });
  assert.match(reportMd, /## Comparison vs baseline/);
  assert.match(toJson(scored, ctx, { comparison: cmp }), /"comparison"/);
});

test('bad baseline inputs fail with clear messages', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'lg-baseline-'));
  await assert.rejects(() => loadBaseline(join(dir, 'missing.json')), /Baseline file not found/);
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, '{oops', 'utf8');
  await assert.rejects(() => loadBaseline(bad), /not valid JSON/);
  const wrong = join(dir, 'wrong.json');
  writeFileSync(wrong, JSON.stringify({ tool: 'other-tool', score: 10, grade: 'B', checks: [] }), 'utf8');
  const fromWrong = await loadBaseline(wrong);
  assert.throws(() => compareResults(fromWrong, CURRENT_FIXES), /not a LaunchGrade report/);
  const incomplete = join(dir, 'incomplete.json');
  writeFileSync(incomplete, JSON.stringify({ score: 50, grade: 'C' }), 'utf8');
  assert.throws(() => compareResults(JSON.parse(readFileSync(incomplete, 'utf8')), CURRENT_FIXES), /missing score\/grade\/checks|not a LaunchGrade/);
});

test('toJson output validates against the published JSON Schema', async () => {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(GOOD_HTML);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try {
    const signal = await audit(`http://127.0.0.1:${port}/`, { timeout: 5000 });
    const json = JSON.parse(toJson(signal.scored, signal.ctx));
    const schema = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'schema', 'report.schema.json'), 'utf8'));
    assert.equal(validateAgainstSchema(json, schema), null);
    assert.match(json.$schema, /\/v0\.2\.0\/schema\/report\.schema\.json$/);
  } finally {
    server.close();
  }
});

function validateAgainstSchema(instance, schema, path = '$') {
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeOk(instance, t))) return `${path}: expected ${types.join(' | ')} but got ${describeType(instance)}`;
  }
  if (schema.enum && !schema.enum.includes(instance)) return `${path}: ${JSON.stringify(instance)} not in enum`;
  if ('const' in schema && instance !== schema.const) return `${path}: expected const ${JSON.stringify(schema.const)}`;
  if (typeof instance === 'number' && Number.isFinite(instance)) {
    if (schema.minimum != null && instance < schema.minimum) return `${path}: below minimum`;
    if (schema.maximum != null && instance > schema.maximum) return `${path}: above maximum`;
  }
  if (instance && typeof instance === 'object' && !Array.isArray(instance)) {
    for (const key of schema.required || []) {
      if (!(key in instance)) return `${path}: missing required field ${key}`;
    }
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      if (key in instance) {
        const err = validateAgainstSchema(instance[key], sub, `${path}.${key}`);
        if (err) return err;
      }
    }
  }
  if (Array.isArray(instance) && schema.items) {
    for (let i = 0; i < instance.length; i++) {
      const err = validateAgainstSchema(instance[i], schema.items, `${path}[${i}]`);
      if (err) return err;
    }
  }
  return null;
}

function typeOk(value, type) {
  switch (type) {
    case 'integer': return Number.isInteger(value);
    case 'number': return typeof value === 'number' && !Number.isNaN(value);
    case 'string': return typeof value === 'string';
    case 'boolean': return typeof value === 'boolean';
    case 'object': return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    case 'array': return Array.isArray(value);
    case 'null': return value === null;
    default: return false;
  }
}

function describeType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
