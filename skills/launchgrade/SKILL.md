---
name: launchgrade
description: Grade a landing page before it ships. Use when the user asks to audit, review, score, preflight, or sanity-check a launch page, product site, waitlist, portfolio, or startup homepage — especially for conversion, trust, SEO, social preview cards, accessibility, technical basics, or AI-agent readiness. Also use before a Product Hunt / Hacker News / X launch, and to verify fixes with an honest before-and-after score.
license: Apache-2.0
metadata:
  author: FastPress Labs
  homepage: https://fastpresspages.github.io/launchgrade/
---

# LaunchGrade

LaunchGrade is a zero-dependency Node.js CLI that grades a public page against 53 checks in 7 weighted categories. It fetches the page and a few well-known files (`robots.txt`, `sitemap.xml`, `llms.txt`, `AGENTS.md`, `security.txt`, MCP/OpenAPI discovery), scores what it finds, and returns the fixes that matter most.

Use it when someone is about to share a link and wants a second opinion that is specific, fast, and repeatable. It is a heuristic checklist, **not** Lighthouse, not a Google ranking tool, and not a substitute for real user research.

## When to use this skill

- "Audit my landing page", "grade my launch", "is this page ready?"
- "Why does my link preview look broken?" (Open Graph / Twitter cards)
- "Check my site before Product Hunt / HN / X"
- "Does my site work for AI agents?" (`llms.txt`, `AGENTS.md`, crawler access)
- Comparing before/after a redesign or a set of fixes
- Adding a launch-quality gate to CI

Do **not** use it to scan private dashboards, authenticated pages, or sites the user does not own or have permission to test. Do not use it as a security scanner.

## Prerequisites

- Node.js 18.17 or newer.
- Network access to the target page if it is remote.
- The CLI itself. Prefer, in order:
  1. If the current repo is LaunchGrade: `node bin/launchgrade.js`.
  2. Otherwise, no install: `npx -p github:fastpresspages/launchgrade launchgrade`.
  3. If the npm package is published later: `npx launchgrade`.
- On Windows PowerShell, `npm.ps1` is sometimes blocked. Use `npx.cmd` or `node` directly.

## Core workflow

1. **Confirm the target.** Get the exact public URL. If the user gives a bare domain, `https://` is added automatically. For local development, a `http://localhost` or `http://127.0.0.1` URL is acceptable — add `--ignore tech.https`.
2. **Run once, save artifacts.** Prefer `--out` so the JSON is readable without parsing terminal color codes:

   ```bash
   npx -p github:fastpresspages/launchgrade launchgrade https://example.com --out .launchgrade
   ```

   This writes `.launchgrade/report.json`, `report.md`, `report.html`, `badge.svg`, and `fix-plan.md`. Read `.launchgrade/report.json`.
3. **Report the grade honestly.** Lead with the score, grade, and label. Then the category table. Then the top 3 fixes — not all 53 checks.
4. **Offer the next step.** Ask whether to implement the top fixes. If yes, make the changes, rerun, and show the real delta. Never invent a higher score.

For a quick look without files:

```bash
npx -p github:fastpresspages/launchgrade launchgrade example.com
npx -p github:fastpresspages/launchgrade launchgrade example.com --md
npx -p github:fastpresspages/launchgrade launchgrade example.com --json
```

## Reading the JSON

Top-level fields:

- `grade`, `score`, `label` — letter grade, 0–100 score, human label.
- `counts` — `pass`, `warn`, `fail`, `info`, `error`, `skipped`, `total`.
- `categories[]` — `key`, `label`, `weight`, `score`, `counts`.
- `topFixes[]` — ordered by severity and impact: `id`, `category`, `status`, `title`, `detail`, `fix`, `impact`.
- `results[]` — every check, including passes and informational notes.

Scoring: pass = 1, warn = 0.5, fail/error = 0. Informational checks do not affect the score. Each category is normalized to 100 and the overall score is the weighted average of scored categories.

Category weights:

| Category | Weight |
| --- | ---: |
| Conversion | 25% |
| Technical | 20% |
| Trust | 15% |
| SEO | 15% |
| Social sharing | 10% |
| AI-agent readiness | 10% |
| Accessibility | 5% |

Grade bands: A+ ≥95, A ≥90, A− ≥85, B+ ≥80, B ≥75, B− ≥70, C+ ≥65, C ≥60, C− ≥55, D ≥40, F <40.

Labels: ≥90 Launch-ready, ≥80 Almost there, ≥70 Needs polish, ≥60 Risky launch, below 60 Not ready.

## How to present results

Keep the default summary under ~200 words:

```markdown
**A+ 100/100 - Launch-ready** (48 scored: 47 pass, 1 warn, 0 fail; the warning is a deliberate no-analytics choice)

| Category | Score |
| --- | ---: |
| Conversion | 93 |
| Trust | 38 |
| Technical | 91 |
| SEO | 79 |
| Social sharing | 20 |
| Accessibility | 100 |
| AI-agent readiness | 50 |

**Fix first**
1. `social.open-graph` — add a complete Open Graph card (title, description, image, URL, type) and a 1200×630 image.
2. `trust.privacy` — link a real privacy page from the footer.
3. `agent.llms-txt` — publish `/llms.txt` with the product summary and key links.

Want me to implement these three and rerun the scan?
```

Then, only if asked, expand into the full report or explain a category.

## Implementing fixes

- Read the check's `detail` and `fix` fields before editing. Fix the actual cause, not the check.
- Map checks to real changes:
  - `social.open-graph`, `social.og-image`, `social.twitter-card` → `<head>` meta tags; verify the image is absolute and 1200×630.
  - `trust.privacy`, `trust.terms`, `trust.about` → real, linked pages with plain-language content.
  - `conv.email-capture`, `conv.friction` → a visible, labelled email form with a clear value exchange. Do not add fake urgency or hidden opt-ins.
  - `seo.title`, `seo.description`, `seo.h1` → one honest title/description/H1 aligned with the page.
  - `agent.llms-txt`, `agent.agents-md`, `agent.robots-ai` → publish the files and allow the named AI crawlers intentionally.
  - `tech.compression`, `tech.cache`, `tech.viewport` → hosting/config fixes, not copy changes.
- Never add fake testimonials, user counts, logos, security claims, or analytics just to make a check pass. If a check does not apply, use `--ignore <id>` and explain why.
- After edits, rerun with the same URL and flags. Report the real before/after score and which checks changed. A score can go down if content was removed; say so.

## CI usage

Fail a build when the page drops below a threshold:

```bash
npx -p github:fastpresspages/launchgrade launchgrade https://example.com --fail-under 80
```

Exit codes: `0` success, `1` fetch/usage error, `2` below `--fail-under`.

GitHub Actions:

```yaml
- uses: fastpresspages/launchgrade@main
  with:
    url: https://example.com
    fail-under: 80
    out: launchgrade-report
```

Upload `launchgrade-report/` as an artifact if the workflow should keep the HTML report.

## MCP and agent use

The package ships a zero-dependency stdio MCP server:

```json
{
  "mcpServers": {
    "launchgrade": {
      "command": "npx",
      "args": ["-y", "-p", "github:fastpresspages/launchgrade", "launchgrade-mcp"]
    }
  }
}
```

Tools: `grade_launch` (`url`, `format`: `markdown` | `json`, optional `max_fixes`), `get_fix_plan`, `list_checks`. Prefer `grade_launch` with `format: "json"` when you need to reason over individual checks; use `markdown` for a display-ready summary.

## Flags worth knowing

| Flag | Use |
| --- | --- |
| `--out <dir>` | Write all five report artifacts |
| `--md`, `--json`, `--html`, `--badge` | Print one artifact to stdout |
| `--fail-under <n>` | CI gate; exit 2 below threshold |
| `--ignore <ids>` | Comma-separated legitimate exceptions |
| `--fast` | Skip extras (`robots.txt`, sitemap, `llms.txt`, etc.) |
| `--timeout <ms>` | Per-request timeout; default 15000 |
| `--list` | Every check, weight, and rationale |
| `--no-color` | Plain terminal output |
| `-q, --quiet` | Only the essentials |

## Guardrails

- **One page per request.** Do not crawl a site or scan dozens of URLs unless the user explicitly asks and owns them.
- **Public or owned only.** Do not bypass logins, paywalls, or bot protection. Do not put tokens or credentials in a URL.
- **No form submissions.** LaunchGrade reads HTML; it never submits forms. Do not submit the user's audit form on their behalf.
- **Respect the limits.** A single fetch per page plus small well-known files. Do not loop or hammer.
- **Be honest about scope.** A high score is not a guarantee of conversions, traffic, accessibility compliance, or search ranking. Say what the tool actually measured.
- **Privacy.** Reports contain public page content only. Do not paste private analytics, emails, or customer data into a report.
- **No fake metrics.** Never claim stars, users, revenue, endorsements, or deals that do not exist. The sample in the repo is a real dated scan; treat it as a snapshot, not a promise.

## Reference

- Site and free human audit: https://fastpresspages.github.io/launchgrade/
- Source: https://github.com/fastpresspages/launchgrade
- Checks and weights: `src/checks.js` in the repo, or `launchgrade --list`
- Sample real report: `samples/youlauncher/report.html`
