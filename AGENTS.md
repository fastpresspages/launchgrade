# AGENTS.md

Instructions for coding agents working in this repository.

## What this is

LaunchGrade is a zero-dependency Node.js CLI, library, MCP server and static site that grades public launch pages. It is part of [FastPress Labs](https://github.com/fastpresspages).

Brand: **FastPress Labs**. Product: **LaunchGrade** (“Grade your launch before the internet does.”).
Colors: near-black `#08080A`, lime `#C6FF4A`, violet `#A78BFA`, green `#3DDC84`, amber `#FFB020`, red `#FF5C5C`. Fonts: Inter/Space Grotesk on the site, system monospace in reports.

## Rules

1. **Zero runtime dependencies.** Do not add npm packages to `dependencies`. Dev-only tooling needs a strong reason.
2. **No build step.** The site is plain HTML/CSS/JS. The CLI runs directly with `node`.
3. **No fabricated metrics.** Never add fake stars, users, revenue, testimonials or “trusted by” logos. Samples must be real scans with a URL and date.
4. **No dark patterns.** Do not add checks that reward fake urgency, hidden text, keyword stuffing, fake scarcity or deceptive copy.
5. **Keep checks deterministic and offline.** Network fetching lives in `src/context.js`; checks only read the prepared context.
6. **Preserve the JSON contract** unless the task explicitly allows a breaking change.
7. **No telemetry.** Do not add analytics or phone-home behavior.

## Layout

```text
bin/launchgrade.js     CLI entry point and flags
src/util.js            tiny HTML/string helpers, no DOM
src/context.js         fetch page + well-known extras, version
src/checks.js          CATEGORIES, CHECKS, runChecks, robots parser
src/score.js           weighted category scores, grades, top fixes
src/report.js          terminal, Markdown, JSON, HTML, SVG, fix plan
src/index.js           public audit() API
mcp/server.js          stdio JSON-RPC MCP server
test/                  node:test suite and fixtures
site/                  static marketing site (GitHub Pages)
skills/launchgrade/    portable agent skill
action.yml             composite GitHub Action
assets/                SVG brand assets
samples/               real, dated audit outputs
```

## Commands

```bash
node --test
node bin/launchgrade.js --list
node bin/launchgrade.js https://example.com --out reports
node mcp/server.js          # stdio; expects JSON-RPC on stdin
node scripts/serve.js       # if present; otherwise use any static server
```

On Windows, `npm.ps1` may be blocked by execution policy. Use `node` directly, or `npm.cmd` / `cmd /c npm`.

## Adding or changing a check

Follow [`CONTRIBUTING.md`](CONTRIBUTING.md). Contract:

```js
{
  id: 'category.kebab-case',   // unique
  category: 'conversion',      // key in CATEGORIES
  weight: 1,                   // 1-4, impact inside the category
  title: 'Short human sentence',
  run(p) {
    return result('pass' | 'warn' | 'fail' | 'info', 'what was found', 'what to do', 'evidence');
  }
}
```

- Checks must never throw for missing page features.
- A check that always returns `info` does not affect the score.
- Add a fixture that proves both the passing and failing path.
- The test suite asserts unique IDs and a known category.

## Scoring and reports

- `src/score.js` normalizes each category to 100, then applies category weights: conversion 25, trust 15, technical 20, SEO 15, social 10, accessibility 5, agent 10.
- `pass` = 1, `warn` = 0.5, `fail`/`error` = 0, `info`/`skipped` excluded.
- `renderHtml` must escape all page-derived strings with `escapeHtml`.
- Reports should remain readable with JavaScript disabled and in print.

## Verification before finishing

1. `node --test` — all tests pass.
2. `node bin/launchgrade.js https://example.com --fast` — real page works.
3. `node bin/launchgrade.js --list` — check list renders.
4. If the site changed, open `site/index.html` and test mobile width, keyboard focus and the form.
5. If the report changed, generate `--out` and inspect `report.html` in a browser.
6. Check `git diff` for accidental mojibake, secrets or fake claims.

## Commit style

Short imperative subject, for example:

```text
Add refund policy check with fixture
Fix Open Graph detection for property attributes
Polish mobile hero and audit form
```

Keep unrelated changes out of the same commit.
