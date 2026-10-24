#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { audit } from '../src/index.js';
import { compareResults, loadBaseline, renderCompareTerminal } from '../src/compare.js';
import { renderTerminal, renderMarkdown, renderHtml, renderBadge, renderFixPlan, toJson } from '../src/report.js';
import { VERSION } from '../src/context.js';

import { CHECKS, CATEGORIES } from '../src/checks.js';

const HELP = `
  LaunchGrade ${VERSION} — the 60-second launch audit.

  Usage
    launchgrade <url> [options]
    launchgrade --list

  Options
    -f, --format <terminal|json|markdown>   Output format (default: terminal)
    -o, --out <dir>        Write report.html, report.json, report.md, badge.svg, fix-plan.md
        --html <file>      Write the standalone HTML report
        --md <file>        Write the markdown report
        --json             Print JSON (same as --format json)
        --badge <file>     Write an SVG grade badge
        --fail-under <n>   Exit 2 if the score is below n (CI gate)
        --compare <file>   Diff this scan against a saved report.json (before/after)
        --ignore <ids>     Comma-separated check ids to skip
        --timeout <ms>     Per-request timeout (default: 15000)
        --fast             Skip the well-known file probes (robots, llms.txt, …)
        --list             Print every check, grouped by category
        --no-color         Disable ANSI colors
    -q, --quiet            Suppress the terminal report
    -h, --help             Show this help
    -v, --version          Show the version

  Examples
    npx -p github:fastpresspages/launchgrade launchgrade https://example.com
    npx -p github:fastpresspages/launchgrade launchgrade example.com --out reports
    launchgrade example.com --fail-under 80 --quiet
    launchgrade example.com --json > report.json
    launchgrade example.com --compare reports/old/report.json --out reports/new

  Checks: conversion, trust, technical, SEO, social, accessibility, AI-agent readiness.
  Docs: https://github.com/fastpresspages/launchgrade
`;

function fail(message) {
  process.stderr.write(`\n  launchgrade: ${message}\n\n`);
  process.exit(1);
}

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      format: { type: 'string', short: 'f' },
      out: { type: 'string', short: 'o' },
      html: { type: 'string' },
      md: { type: 'string' },
      json: { type: 'boolean' },
      badge: { type: 'string' },
      'fail-under': { type: 'string' },
      compare: { type: 'string' },
      ignore: { type: 'string' },
      timeout: { type: 'string' },
      fast: { type: 'boolean' },
      list: { type: 'boolean' },
      'no-color': { type: 'boolean' },
      quiet: { type: 'boolean', short: 'q' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });
} catch (error) {
  fail(error.message);
}

const { values, positionals } = parsed;
if (values.help) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (values.version) {
  process.stdout.write(`${VERSION}\n`);
  process.exit(0);
}
if (values.list) {
  for (const [key, category] of Object.entries(CATEGORIES)) {
    const items = CHECKS.filter((check) => check.category === key);
    const total = items.reduce((sum, check) => sum + check.weight, 0);
    process.stdout.write(`\n  ${category.label} · ${category.weight}% of grade · ${items.length} checks\n`);
    process.stdout.write(`  ${category.blurb}\n\n`);
    for (const check of items) {
      process.stdout.write(`    ${check.id.padEnd(30)} ${String(check.weight).padStart(2)}  ${check.title}\n`);
    }
    process.stdout.write(`    ${''.padEnd(30)} ${String(total).padStart(2)}  total weight\n`);
  }
  process.stdout.write(`\n  ${CHECKS.length} checks total · category weights above · zero dependencies\n\n`);
  process.exit(0);
}
if (!positionals.length) {
  process.stdout.write(HELP);
  process.exit(1);
}

const rawUrl = positionals[0].trim();
if (!/^https?:\/\//i.test(rawUrl)) {
  if (/^[\w.-]+\.[a-z]{2,}([\/:?#]|$)/i.test(rawUrl)) {
    positionals[0] = `https://${rawUrl}`;
  } else {
    fail(`“${rawUrl}” is not a URL. Try https://example.com`);
  }
}

const url = positionals[0];
const format = values.json ? 'json' : (values.format || 'terminal').toLowerCase();
if (!['terminal', 'json', 'markdown', 'md'].includes(format)) {
  fail(`Unknown format “${format}”. Use terminal, json or markdown.`);
}
const ignore = (values.ignore || '').split(',').map((s) => s.trim()).filter(Boolean);
const timeout = Number(values.timeout) || 15000;
const failUnder = values['fail-under'] != null ? Number(values['fail-under']) : null;
if (failUnder != null && (Number.isNaN(failUnder) || failUnder < 0 || failUnder > 100)) {
  fail('--fail-under must be a number between 0 and 100.');
}

const started = Date.now();
let baseline = null;
if (values.compare) {
  try {
    baseline = await loadBaseline(resolve(values.compare));
  } catch (error) {
    fail(error.message);
  }
}
let ctx;
let scored;
try {
  ({ ctx, scored } = await audit(url, { timeout, ignore, extras: !values.fast }));
} catch (error) {
  fail(error.message);
}

const comparison = baseline
  ? compareResults(baseline, {
      url: ctx.url,
      grade: scored.grade,
      score: scored.score,
      label: scored.label,
      generatedAt: new Date().toISOString(),
      counts: {
        pass: scored.counts.pass, warn: scored.counts.warn, fail: scored.counts.fail,
        error: scored.counts.error, info: scored.counts.info,
      },
      categories: scored.categories.map((c) => ({ key: c.key, label: c.label, short: c.short, score: c.score, weight: c.weight, counts: c.counts })),
      checks: scored.results.map((r) => ({ id: r.id, category: r.category, title: r.title, status: r.status, weight: r.weight, detail: r.detail, fix: r.fix })),
    })
  : null;

const terminal = renderTerminal(scored, ctx, { color: !values['no-color'], maxFixes: 8 })

if (values.out) {
  const outDir = resolve(values.out);
  await mkdir(outDir, { recursive: true });
  await Promise.all([
    writeFile(join(outDir, 'report.html'), renderHtml(scored, ctx, { comparison }), 'utf8'),
    writeFile(join(outDir, 'report.json'), toJson(scored, ctx, { comparison }), 'utf8'),
    writeFile(join(outDir, 'report.md'), renderMarkdown(scored, ctx, { comparison }), 'utf8'),
    writeFile(join(outDir, 'badge.svg'), renderBadge(scored), 'utf8'),
    writeFile(join(outDir, 'fix-plan.md'), renderFixPlan(scored, ctx), 'utf8'),
  ]);
  if (!values.quiet) {
    process.stdout.write(terminal);
    if (comparison) process.stdout.write(renderCompareTerminal(comparison, { color: !values['no-color'] }));
    process.stdout.write(`\n  Wrote 5 files to ${outDir}\n`);
    process.stdout.write(`  Open: ${join(outDir, 'report.html')}\n\n`);
  }
} else if (values.html) {
  await mkdir(dirname(resolve(values.html)), { recursive: true });
  await writeFile(resolve(values.html), renderHtml(scored, ctx, { comparison }), 'utf8');
  if (!values.quiet) process.stdout.write(terminal + (comparison ? renderCompareTerminal(comparison, { color: !values['no-color'] }) : '') + `\n  Wrote ${resolve(values.html)}\n\n`);
} else if (values.md) {
  await mkdir(dirname(resolve(values.md)), { recursive: true });
  await writeFile(resolve(values.md), renderMarkdown(scored, ctx, { comparison }), 'utf8');
  if (!values.quiet) process.stdout.write(terminal + '\n  Wrote ' + resolve(values.md) + '\n\n');
} else if (values.badge) {
  await mkdir(dirname(resolve(values.badge)), { recursive: true });
  await writeFile(resolve(values.badge), renderBadge(scored), 'utf8');
  if (!values.quiet) process.stdout.write(terminal + '\n  Wrote ' + resolve(values.badge) + '\n\n');
} else if (!values.quiet) {
  if (format === 'json') process.stdout.write(toJson(scored, ctx, { comparison }) + '\n');
  else if (format === 'markdown' || format === 'md') process.stdout.write(renderMarkdown(scored, ctx, { comparison }) + '\n');
  else {
    process.stdout.write(terminal + '\n');
    if (comparison) process.stdout.write(renderCompareTerminal(comparison, { color: !values['no-color'] }));
  }
}

if (failUnder != null && scored.score < failUnder) {
  process.stderr.write(`  launchgrade: score ${scored.score}/100 is below --fail-under ${failUnder} (${Date.now() - started} ms)\n\n`);
  process.exit(2);
}
process.exit(0);
