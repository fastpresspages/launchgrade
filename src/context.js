/**
 * Fetch a page and the small well-known files that make a launch auditable.
 * Every extra request is best-effort: a missing file is data, not an error.
 */

export const VERSION = '0.3.0';
export const USER_AGENT = `LaunchGrade/${VERSION} (+https://github.com/fastpresspages/launchgrade)`;

const EXTRA_PATHS = {
  robots: 'robots.txt',
  sitemap: 'sitemap.xml',
  llms: 'llms.txt',
  llmsFull: 'llms-full.txt',
  security: '.well-known/security.txt',
  agents: 'agents.md',
  agentsUpper: 'AGENTS.md',
  mcp: '.well-known/mcp.json',
  openapi: '.well-known/openapi.json',
};

export async function buildContext(url, options = {}) {
  const timeout = Number(options.timeout) || 15000;
  const maxBytes = Number(options.maxBytes) || 3_000_000;
  const main = await fetchPage(url, { timeout, maxBytes });

  const finalUrl = main.url || url;
  const base = new URL(finalUrl);
  const bases = extraBases(finalUrl);
  const extras = {};

  if (options.extras !== false) {
    const tasks = Object.entries(EXTRA_PATHS).map(async ([key, path]) => {
      extras[key] = await fetchExtra(path, bases, { timeout: Math.min(timeout, 5000) });
    });
    tasks.push(
      (async () => {
        extras.markdown = await negotiateMarkdown(finalUrl, { timeout: Math.min(timeout, 5000) });
      })(),
    );
    await Promise.allSettled(tasks);
  }

  return {
    requestedUrl: url,
    url: finalUrl,
    origin: base.origin,
    html: main.body,
    status: main.status,
    headers: main.headers,
    ms: main.ms,
    bytes: main.bytes,
    extras,
    fetchedAt: new Date().toISOString(),
  };
}

/** Build a context from supplied HTML (used by tests and the MCP server). */
export function buildContextFromHtml({ html, url = 'https://example.com/', headers = {}, extras = {} }) {
  return {
    requestedUrl: url,
    url,
    origin: new URL(url).origin,
    html: String(html || ''),
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
    ms: 0,
    bytes: Buffer.byteLength(String(html || '')),
    extras,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchPage(url, { timeout = 15000, maxBytes = 3_000_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.8',
      },
    });
    const { body, bytes, truncated } = await readLimited(res, maxBytes);
    return {
      ok: res.ok,
      status: res.status,
      url: res.url || url,
      headers: headersToObject(res.headers),
      body,
      bytes,
      truncated,
      ms: Date.now() - started,
    };
  } catch (error) {
    const wrapped = new Error(explainNetworkError(error, url));
    wrapped.cause = error;
    throw wrapped;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Well-known files normally live at the site root. On project pages (for
 * example https://org.github.io/repo/) the deploy root includes the repo path,
 * so try the page directory first and fall back to the domain root.
 */
function extraBases(url) {
  const page = new URL(url);
  const dir = new URL(page.href);
  if (!dir.pathname.endsWith('/')) {
    dir.pathname = dir.pathname.replace(/[^/]*$/, '');
  }
  const root = new URL('/', page.origin);
  return dir.href === root.href ? [dir] : [dir, root];
}

async function fetchExtra(path, bases, options) {
  let last;
  for (const base of bases) {
    last = await fetchSmall(new URL(path, base).href, options);
    if (last.ok) return last;
  }
  return last;
}

async function fetchSmall(url, { timeout = 5000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept: '*/*' },
    });
    const { body, bytes } = await readLimited(res, 262_144);
    return {
      ok: res.ok,
      status: res.status,
      url: res.url || url,
      contentType: res.headers.get('content-type') || '',
      body,
      bytes,
      ms: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      contentType: '',
      body: '',
      bytes: 0,
      ms: Date.now() - started,
      error: error.name === 'AbortError' ? 'timeout' : error.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Ask the server whether it can serve markdown to agents (content negotiation). */
async function negotiateMarkdown(url, { timeout = 5000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/markdown, text/plain;q=0.8, text/html;q=0.5',
      },
    });
    const contentType = res.headers.get('content-type') || '';
    const vary = res.headers.get('vary') || '';
    try {
      await res.body?.cancel();
    } catch {
      /* already closed */
    }
    return {
      ok: res.ok,
      status: res.status,
      contentType,
      vary,
      markdown: /text\/(markdown|x-markdown)/i.test(contentType),
    };
  } catch (error) {
    return { ok: false, status: 0, contentType: '', markdown: false, error: error.name === 'AbortError' ? 'timeout' : error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function readLimited(res, maxBytes) {
  if (!res.body) return { body: '', bytes: 0, truncated: false };
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  let truncated = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxBytes - total;
      if (value.byteLength >= remaining) {
        chunks.push(value.subarray(0, remaining));
        total += remaining;
        truncated = true;
        await reader.cancel().catch(() => {});
        break;
      }
      chunks.push(value);
      total += value.byteLength;
    }
  } catch {
    /* return what we have */
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body: new TextDecoder('utf-8').decode(merged), bytes: total, truncated };
}

function headersToObject(headers) {
  const out = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

function explainNetworkError(error, url) {
  if (error.name === 'AbortError') return `Timed out fetching ${url}. The site may be slow, blocking bots, or offline.`;
  if (/ENOTFOUND|EAI_AGAIN/.test(error.message)) return `Could not resolve ${url}. Check the domain spelling.`;
  if (/ECONNREFUSED/.test(error.message)) return `Connection refused by ${url}.`;
  if (/certificate|SSL|TLS/i.test(error.message)) return `TLS certificate problem for ${url}: ${error.message}`;
  return `Could not fetch ${url}: ${error.message}`;
}
