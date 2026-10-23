#!/usr/bin/env node
/**
 * LaunchGrade MCP server — zero dependencies, stdio transport.
 *
 * Any MCP client (Claude Code, Cursor, OpenCode, Codex, Windsurf…)
 * can grade a launch page and get a prioritized fix plan.
 */
import { createInterface } from 'node:readline';
import { audit } from '../src/index.js';
import { CHECKS, CATEGORIES } from '../src/checks.js';
import { renderMarkdown, renderFixPlan } from '../src/report.js';
import { VERSION } from '../src/context.js';

const TOOLS = [
  {
    name: 'grade_launch',
    title: 'Grade a launch page',
    description:
      'Audit a public URL for launch readiness: conversion, trust, technical, SEO, social sharing, accessibility and AI-agent readiness. Returns a letter grade, a score out of 100, and a prioritized fix list. Use this before announcing a product, after changing a landing page, or when a user asks why a page is not converting.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Public URL to audit, including https://.' },
        format: { type: 'string', enum: ['markdown', 'json'], default: 'markdown', description: 'markdown is readable; json is machine-readable.' },
        max_fixes: { type: 'integer', minimum: 1, maximum: 20, default: 8, description: 'How many prioritized fixes to include.' },
      },
      required: ['url'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'get_fix_plan',
    title: 'Get a step-by-step fix plan',
    description:
      'Return an ordered, plain-language fix plan for a URL, with the reason and the exact change for each issue. Useful when the user wants to hand work to a builder or another agent.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Public URL to audit, including https://.' },
      },
      required: ['url'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'list_checks',
    title: 'List every audit check',
    description:
      'List the checks LaunchGrade runs, grouped by category, with ids and weights. Use this to explain a grade or to choose which checks a team should fix first.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const INSTRUCTIONS = `LaunchGrade grades public launch pages in about a minute.

Workflow:
1. Call grade_launch with the URL the user is about to ship or is worried about.
2. Lead with the grade and score, then the 2-3 highest-impact fixes. Do not dump all 50 checks unless asked.
3. Call get_fix_plan when the user wants to implement the fixes.
4. Never invent a score. If a page blocks bots or times out, report that honestly.
5. Scores are heuristics, not guarantees. Re-run after changes.

The audit is read-only. It fetches the page plus robots.txt, sitemap.xml, llms.txt, security.txt, agents.md and well-known descriptors.`;

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function ok(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function error(id, code, message, data) {
  send({ jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } });
}

export async function handleRequest(request) {
  const { id, method, params } = request || {};
  const isNotification = id === undefined || id === null;

  if (method === 'initialize') {
    return {
      protocolVersion: typeof params?.protocolVersion === 'string' ? params.protocolVersion : '2024-11-05',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'launchgrade', version: VERSION, title: 'LaunchGrade' },
      instructions: INSTRUCTIONS,
    };
  }

  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return null;

  if (method === 'ping') return {};

  if (method === 'tools/list') return { tools: TOOLS };

  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments || {};
    if (name === 'list_checks') {
      const groups = Object.entries(CATEGORIES).map(([key, meta]) => {
        const items = CHECKS.filter((c) => c.category === key).map((c) => `- \`${c.id}\` (weight ${c.weight}) — ${c.title}`);
        return `## ${meta.label} (${meta.weight}% of grade)\n\n${items.join('\n')}`;
      });
      return {
        content: [{ type: 'text', text: `# LaunchGrade checks\n\n${groups.join('\n\n')}` }],
        structuredContent: { checks: CHECKS.map((c) => ({ id: c.id, category: c.category, weight: c.weight, title: c.title })) },
        isError: false,
      };
    }

    if (name === 'grade_launch' || name === 'get_fix_plan') {
      if (!args.url || typeof args.url !== 'string') {
        return { content: [{ type: 'text', text: 'A public url is required, for example https://example.com.' }], isError: true };
      }
      const url = /^https?:\/\//i.test(args.url) ? args.url : `https://${args.url}`;
      try {
        const { ctx, scored } = await audit(url, { timeout: 20000 });
        if (name === 'get_fix_plan') {
          return {
            content: [{ type: 'text', text: renderFixPlan(scored, ctx) }],
            structuredContent: { url: ctx.url, grade: scored.grade, score: scored.score, fixes: scored.topFixes.slice(0, 12) },
            isError: false,
          };
        }
        if (args.format === 'json') {
          return {
            content: [{ type: 'text', text: JSON.stringify({ url: ctx.url, grade: scored.grade, score: scored.score, label: scored.label, counts: scored.counts, categories: scored.categories.map((c) => ({ key: c.key, score: c.score, weight: c.weight })), fixes: scored.topFixes.slice(0, args.max_fixes || 8) }, null, 2) }],
            structuredContent: { url: ctx.url, grade: scored.grade, score: scored.score, label: scored.label },
            isError: false,
          };
        }
        const md = renderMarkdown(scored, ctx);
        const max = clampFix(args.max_fixes, 8);
        const trimmed = trimFixes(md, max);
        return {
          content: [{ type: 'text', text: trimmed }],
          structuredContent: { url: ctx.url, grade: scored.grade, score: scored.score, label: scored.label, counts: scored.counts },
          isError: false,
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Could not grade ${url}: ${err.message}\n\nCheck that the URL is public and responds without a login.` }],
          isError: true,
        };
      }
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }

  if (method === 'resources/list') return { resources: [] };
  if (method === 'prompts/list') return { prompts: [] };

  if (isNotification) return null;
  throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 });
}

function clampFix(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(20, Math.round(n)));
}

/** Keep only the first N fixes in the markdown "Fix these first" block. */
function trimFixes(markdown, max) {
  const marker = '## Fix these first';
  const start = markdown.indexOf(marker);
  if (start === -1) return markdown;
  const after = markdown.indexOf('<details>', start);
  if (after === -1) return markdown;
  const block = markdown.slice(start, after);
  const parts = block.split(/\n(?=\d+\. )/);
  if (parts.length <= max + 1) return markdown;
  return markdown.slice(0, start) + parts.slice(0, max + 1).join('\n') + '\n\n' + markdown.slice(after);
}

// ── stdio transport ─────────────────────────────────────────────────────────
const isMain = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || /server\.js$/i.test(process.argv[1] || '');

if (isMain) {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  let queue = Promise.resolve();

  rl.on('line', (line) => {
    if (!line.trim()) return;
    queue = queue.then(async () => {
      let request;
      try {
        request = JSON.parse(line);
      } catch {
        error(null, -32700, 'Parse error');
        return;
      }
      try {
        const result = await handleRequest(request);
        if (result !== null && request.id !== undefined && request.id !== null) ok(request.id, result);
      } catch (err) {
        error(request.id ?? null, err.code || -32603, err.message || 'Internal error');
      }
    });
  });

  rl.on('close', () => {
    queue.finally(() => process.exit(0));
  });
}
