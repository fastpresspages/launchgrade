export { buildContext, buildContextFromHtml, VERSION } from './context.js';
export { CHECKS, CATEGORIES, runChecks } from './checks.js';
export { scoreResults, compactSummary } from './score.js';
export { renderTerminal, renderMarkdown, renderHtml, renderBadge, renderFixPlan, toJson } from './report.js';

import { buildContext } from './context.js';
import { runChecks } from './checks.js';
import { scoreResults } from './score.js';

/**
 * Grade a live URL.
 * @param {string} url
 * @param {{timeout?: number, ignore?: string[], extras?: boolean}} options
 */
export async function audit(url, options = {}) {
  const ctx = await buildContext(url, options);
  const results = runChecks(ctx, { ignore: options.ignore || [] });
  const scored = scoreResults(results);
  return { ctx, scored };
}
