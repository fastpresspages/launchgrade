# Changelog

All notable changes to LaunchGrade are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-10-24

### Added

- `--compare <report.json>`: run a new scan against a saved baseline and get the full before/after delta in one artifact — overall score/grade delta, per-category deltas, every check that moved (fail→pass, pass→warn and regressions the other way) and checks added/removed by tool changes. Terminal prints a compact delta table; the same data is embedded in the HTML and Markdown reports and under a `comparison` key in `report.json`.
- Real difference run: the YouLauncher rebuild scores **B- 71 → A+ 100 (+29, 20 checks improved)** — see `samples/youlauncher-recovery/report.html`.
- `schema/report.schema.json` (JSON Schema draft 2020-12, mirrored at tags) documents the `report.json` shape, including the new `comparison` object. `report.json` now carries a `$schema` URL so editors can validate it directly.
- Compatibility policy: additive fields may ship at any release; breaking changes to existing fields require a major bump.
- `src/compare.js` exposes the diff as a pure function `compareResults(baseline, current)` so agents and scripts can diff reports without a scan.
- 4 new tests: compare classification, renderer/JSON embedding, bad-baseline messages, and a real report validated against the published schema.

[0.2.0]: https://github.com/fastpresspages/launchgrade/releases/tag/v0.2.0

## [0.1.0] — 2026-10-23

First public release.

### Added

- Zero-dependency Node.js CLI that audits a public launch page across **53 checks in 7 weighted categories**: conversion, trust, technical, SEO, social sharing, accessibility and AI-agent readiness.
- Terminal report with letter grade, category bars and prioritized fixes.
- Standalone HTML report, Markdown report, JSON output and SVG badge.
- `--out` artifact bundle: `report.html`, `report.md`, `report.json`, `badge.svg`, `fix-plan.md`.
- `--fail-under` exit code for CI, plus `--ignore`, `--timeout`, `--fast` and `--list`.
- Composite GitHub Action with inputs for URL, threshold, ignores, output, timeout and format.
- Zero-dependency stdio MCP server with `grade_launch`, `get_fix_plan` and `list_checks`.
- Agent skill at `skills/launchgrade/SKILL.md`, installable with `npx skills add fastpresspages/launchgrade`.
- Well-known file discovery for `robots.txt`, `sitemap.xml`, `llms.txt`, `AGENTS.md`, `security.txt`, MCP and OpenAPI manifests, including project pages hosted under a subpath.
- Static site with a free human audit form, full checklist for agents, sample report and honest privacy/terms pages.
- 11 tests covering parsing, scoring, robots precedence, reporting, MCP and live local audits.

### Known limits

- The npm package name is reserved but not published yet; install from GitHub until the first npm release.
- The score is a heuristic checklist, not Lighthouse, an accessibility certification or a search-ranking guarantee.
- The free human audit is best effort and not a consulting engagement.

[0.1.0]: https://github.com/fastpresspages/launchgrade/releases/tag/v0.1.0
