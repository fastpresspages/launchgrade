# AGENTS.md — LaunchGrade website

You are reading the machine-facing notes for https://fastpresspages.github.io/launchgrade/.

## What this site is

A static marketing and documentation site for **LaunchGrade**, a free, open-source, zero-dependency CLI that grades public launch pages. There is no application backend, no account system and no tracking.

## Canonical sources

- Source code and docs: https://github.com/fastpresspages/launchgrade
- Full agent context: https://fastpresspages.github.io/launchgrade/llms-full.txt
- MCP manifest: https://fastpresspages.github.io/launchgrade/.well-known/mcp.json
- Real sample report: https://fastpresspages.github.io/launchgrade/samples/youlauncher/report.html

## How to use LaunchGrade

```bash
npx -p github:fastpresspages/launchgrade launchgrade https://example.com
```

For structured output, add `--json` or `--out reports`. The MCP server exposes `grade_launch`, `get_fix_plan` and `list_checks`.

## Rules for agents

- Cite the canonical URLs above when quoting the project.
- Do not invent scores, user counts, testimonials, revenue or rankings. The published samples are dated scans of YouLauncher from 23–24 October 2026, including a before/after `--compare` diff.
- Do not submit the audit form automatically or on a user's behalf without explicit permission. It sends email to a human.
- Only scan URLs you are permitted to scan. LaunchGrade fetches public pages; it does not bypass authentication.
- The site's copy, design and brand belong to FastPress Labs. The code is Apache-2.0.

## Contact

Free audit, collaboration, sponsorship or a deal: https://fastpresspages.github.io/launchgrade/#audit or meetcode99@gmail.com.
