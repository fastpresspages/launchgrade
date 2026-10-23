import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { attrs, meta, forms, headings, cleanText } from '../src/util.js';
import { runChecks, isBlocked, CHECKS } from '../src/checks.js';
import { scoreResults } from '../src/score.js';
import { buildContextFromHtml, audit } from '../src/index.js';
import { renderHtml, renderMarkdown, renderBadge, toJson } from '../src/report.js';
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
