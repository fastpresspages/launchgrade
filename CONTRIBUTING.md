# Contributing to LaunchGrade

Thanks for wanting to make launches less broken. This project is intentionally small and dependency-free, so contributions stay easy to review and cheap to run.

## Ground rules

- Be kind. Read the [Code of Conduct](CODE_OF_CONDUCT.md).
- Keep the runtime dependency count at **zero**. If a feature needs a package, it probably belongs in a separate tool.
- A check must be explainable in one sentence and fixable by the person who owns the page.
- Never add a check that rewards dark patterns, fake urgency, hidden text, or keyword stuffing.
- Do not claim users, stars, revenue or adoption numbers we cannot verify.

## Local setup

Requires Node.js 18.17 or newer. There is nothing to install.

```bash
git clone https://github.com/fastpresspages/launchgrade.git
cd launchgrade
node --test
node bin/launchgrade.js --list
node bin/launchgrade.js https://example.com --out reports
```

Run the website locally with any static server, for example:

```bash
npx serve site
# or
python -m http.server 8000 --directory site
```

The site is plain HTML, CSS and JavaScript. No build step.

## Adding a check

1. Pick the category and read the existing checks in [`src/checks.js`](src/checks.js).
2. Use a stable ID: `category.kebab-case`, for example `trust.refund-policy`.
3. Give it a weight from 1 to 4. Weight measures impact inside its category, not global importance.
4. Return `result(status, detail, fix, evidence)`:
   - `pass` — the page does the thing.
   - `warn` — partial or ambiguous; explain what is missing.
   - `fail` — the page does not do the thing; give a fix a human can act on.
   - `info` — useful context that must not affect the score.
5. Never throw for a missing element. Missing data is a `fail` or `info`.
6. Do not fetch anything inside a check. Network work belongs in `src/context.js`; checks read from `p`.
7. Add or update a fixture in `test/launchgrade.test.js` that proves the check can pass and fail.

Skeleton:

```js
{
  id: 'trust.refund-policy',
  category: 'trust',
  weight: 2,
  title: 'Explains refunds before payment',
  run(p) {
    const hit = p.allLinks.find((a) => /refund|money[- ]back/i.test(`${a.href} ${a.text}`));
    if (hit) return result('pass', 'Refund policy link found.', '', hit.href);
    return result('warn', 'No refund policy link found.', 'Add a short refund policy near pricing. Buyers look for the exit before they enter.');
  },
}
```

Then run:

```bash
node --test
node bin/launchgrade.js https://example.com --list
```

All checks must keep unique IDs. The test suite enforces this.

## Changing scoring or reports

Scoring lives in [`src/score.js`](src/score.js), rendering in [`src/report.js`](src/report.js). If you change the scoring model:

- explain the reasoning in the PR;
- update the README table and the sample report;
- keep the JSON shape stable unless the PR is explicitly a breaking change;
- add a test for the new behavior.

## Pull requests

- One focused change per PR.
- Include the command you ran and the result, not a screenshot alone.
- Update documentation when behavior changes.
- CI must pass on Linux and Windows, Node 18, 20 and 22.

A good PR description answers: **What was broken, what changed, and how did you verify it?**

## Checks we are likely to reject

- “Page uses my favorite framework.”
- “Page has 500 words” without context.
- Anything requiring a paid API, a headless browser, or an account.
- Scored checks that are purely aesthetic.
- Checks that would fail most legitimate small sites by default.

## Adding a new report format

Keep it deterministic and dependency-free. Prefer plain text, Markdown, JSON, SVG or standalone HTML. If it needs a build step, it is out of scope for core.

## Release process (maintainers)

1. Update `VERSION` in `src/context.js`, `version` in `package.json`, and the changelog.
2. Run `node --test` and a real scan.
3. Commit, tag `vX.Y.Z`, push the tag.
4. Publish to npm (requires maintainer npm credentials).
5. Verify the GitHub Action and Pages deployment.

## License

By contributing, you agree that your contribution is licensed under Apache-2.0.
