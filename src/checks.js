import {
  attrs, tags, links, images, forms, headings, meta as parseMeta, jsonLd,
  cleanText, visibleText, hasText, absolute, sameOrigin, pct, kb, truncate,
} from './util.js';

export const CATEGORIES = {
  conversion: { label: 'Conversion', short: 'Convert', weight: 25, blurb: 'Can a stranger understand the offer and take one action?' },
  trust: { label: 'Trust', short: 'Trust', weight: 15, blurb: 'Would a careful buyer believe you and feel safe?' },
  technical: { label: 'Technical', short: 'Tech', weight: 20, blurb: 'Does the page load fast, securely and indexably?' },
  seo: { label: 'SEO', short: 'SEO', weight: 15, blurb: 'Can search engines understand and rank the page?' },
  social: { label: 'Social sharing', short: 'Social', weight: 10, blurb: 'Will a shared link look credible in the feed?' },
  a11y: { label: 'Accessibility', short: 'A11y', weight: 5, blurb: 'Can everyone use the page, including keyboard and screen-reader users?' },
  agent: { label: 'AI-agent readiness', short: 'Agents', weight: 10, blurb: 'Can ChatGPT, Claude, Perplexity and coding agents read and recommend you?' },
};

const result = (status, detail, fix = '', evidence = '') => ({ status, detail, fix, evidence });

function prepare(ctx) {
  const html = ctx.html || '';
  const allLinks = links(html);
  const allForms = forms(html);
  const allImages = images(html);
  const allHeadings = headings(html);
  const ld = jsonLd(html);
  const meta = parseMeta(html);
  const text = visibleText(html);
  const linkTags = tags(html, 'link').map(attrs);
  const htmlTag = tags(html, 'html')[0] ? attrs(tags(html, 'html')[0]) : {};
  const title = (html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i) || [])[1] || '';
  const canonical = linkTags.find((l) => /(^|\s)canonical(\s|$)/i.test(l.rel || ''))?.href || '';
  const buttons = [];
  const buttonRe = /<button\b([^>]*)>([\s\S]*?)<\/button\s*>/gi;
  let bm;
  while ((bm = buttonRe.exec(html))) {
    const a = attrs(`<button ${bm[1]}>`);
    buttons.push({ ...a, text: cleanText(bm[2]) });
  }
  for (const input of tags(html, 'input').map(attrs)) {
    if ((input.type || '').toLowerCase() === 'submit') {
      buttons.push({ ...input, text: input.value || '' });
    }
  }
  return {
    html, url: ctx.url, text, meta, title: cleanText(title), allLinks, allForms, allImages,
    allHeadings, ld, linkTags, htmlTag, canonical, buttons,
    extras: ctx.extras || {},
    status: ctx.status,
    headers: ctx.headers || {},
    ms: ctx.ms || 0,
    bytes: ctx.bytes || Buffer.byteLength(html),
  };
}

const STRONG_CTA = /\b(get|start|try|join|book|demo|download|buy|claim|reserve|apply|request|talk|schedule|sign\s?up|create|launch|ship|watch|see (it|how)|grow|audit|scan|score)\b/i;
const WEAK_CTA = /\b(learn more|read more|click here|submit|contact|more info|find out more)\b/i;
const SPAM_REDUCERS = ['no spam', 'unsubscribe', 'no credit card', 'cancel anytime', 'free forever', 'privacy', 'one email', 'no commitment'];
const SOCIAL_PROOF = ['trusted by', 'testimonial', 'testimonials', 'review', 'reviews', 'customers', 'loved by', 'rated', 'case study', 'case studies', 'backed by', 'used by', '★', '⭐', 'wall of love', 'as seen in'];
const SOCIAL_HOSTS = ['x.com', 'twitter.com', 'linkedin.com', 'github.com', 'youtube.com', 'instagram.com', 'discord.gg', 'discord.com', 'tiktok.com', 'bsky.app', 'mastodon.'];
const AI_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Bingbot'];

export const CHECKS = [
  // ── CONVERSION ────────────────────────────────────────────────────────────
  {
    id: 'conv.email-capture', category: 'conversion', weight: 3,
    title: 'Has an email capture',
    run(p) {
      const emailForms = p.allForms.filter((f) =>
        f.inputs.some((i) => (i.type || '').toLowerCase() === 'email' || /email/i.test(`${i.name || ''} ${i.id || ''}`)) ||
        /^mailto:/i.test(f.action || ''));
      const anyEmailInput = p.allForms.some((f) => f.inputs.some((i) => (i.type || '').toLowerCase() === 'email'));
      if (emailForms.length) {
        const action = emailForms[0].action || '';
        return result('pass', `${emailForms.length} form${emailForms.length > 1 ? 's' : ''} can capture an email${action && !/^mailto:/i.test(action) ? ` (posts to ${truncate(action, 60)})` : ''}.`, '', emailForms[0].raw || '');
      }
      if (anyEmailInput) return result('warn', 'An email field exists but is not inside a submittable form.', 'Wrap the field in a <form> with a real action or AJAX handler.');
      return result('fail', 'No email capture found. A launch page without a capture is a poster, not a funnel.', 'Add one email field and one button above the fold. Keep it to one step.');
    },
  },
  {
    id: 'conv.cta', category: 'conversion', weight: 3,
    title: 'Has a specific call to action',
    run(p) {
      const candidates = [
        ...p.allLinks.map((a) => a.text || a['aria-label'] || ''),
        ...p.buttons.map((b) => b.text || b['aria-label'] || ''),
      ].filter(Boolean);
      const strong = candidates.find((t) => STRONG_CTA.test(t));
      if (strong) return result('pass', `Found a direct CTA: “${truncate(strong, 50)}”.`, '', strong);
      const weak = candidates.find((t) => WEAK_CTA.test(t));
      if (weak) return result('warn', `Only a vague CTA found (“${truncate(weak, 40)}”). “Learn more” asks for nothing.`, 'Use one verb and one outcome: “Get my free audit”, “Start free”, “Join the waitlist”.');
      return result('fail', 'No recognizable call to action.', 'Add one primary button above the fold with a verb and a concrete outcome.');
    },
  },
  {
    id: 'conv.social-proof', category: 'conversion', weight: 2,
    title: 'Shows social proof',
    run(p) {
      const found = SOCIAL_PROOF.find((s) => p.text.toLowerCase().includes(s.toLowerCase()));
      const logoAlts = p.allImages.filter((i) => /logo|client|brand|customer/i.test(i.alt || '')).length;
      if (found || logoAlts > 1) return result('pass', found ? `Social proof language found (“${found}”).` : `${logoAlts} customer/logo images found.`, '', found || '');
      return result('warn', 'No testimonials, customer logos or “trusted by” line found.', 'Add one specific quote with a name and role, or a row of recognizable customer logos.');
    },
  },
  {
    id: 'conv.friction', category: 'conversion', weight: 2,
    title: 'Keeps signup friction low',
    run(p) {
      if (!p.allForms.length) return result('warn', 'No form to evaluate.', 'Start with a single email field.');
      const isHoneypot = (i) => String(i.name || '').startsWith('_') || String(i.class || '').split(/\s+/).includes('hp') || String(i.tabindex || '') === '-1';
      const counts = p.allForms.map((f) => f.inputs.filter((i) => !['hidden', 'submit', 'button'].includes((i.type || '').toLowerCase()) && !isHoneypot(i)).length + f.textareas.length + f.selects.length);
      const min = Math.min(...counts);
      if (min <= 2) return result('pass', `The lightest form asks for ${min} field${min === 1 ? '' : 's'}.`);
      if (min <= 4) return result('warn', `The lightest form asks for ${min} fields.`, 'Remove every field you do not need to reply. Name and email are usually enough.');
      return result('fail', `The lightest form asks for ${min} fields.`, 'Cut the form to one email field; ask qualifying questions in the reply.');
    },
  },
  {
    id: 'conv.contact', category: 'conversion', weight: 2,
    title: 'Offers a human contact path',
    run(p) {
      const mailto = p.allLinks.find((a) => /^mailto:/i.test(a.href));
      const contact = p.allLinks.find((a) => /contact|support|talk to|book a call/i.test(`${a.href} ${a.text}`));
      if (mailto) return result('pass', `Direct email link found (${truncate(mailto.href.replace('mailto:', ''), 50)}).`);
      if (contact) return result('pass', `Contact path found: “${truncate(contact.text, 40)}”.`);
      return result('warn', 'No email or contact link found.', 'Add a real email or a contact page. Buyers check for a human before they convert.');
    },
  },
  {
    id: 'conv.value-prop', category: 'conversion', weight: 2,
    title: 'States a clear value proposition',
    run(p) {
      const h1 = p.allHeadings.find((h) => h.level === 1)?.text || '';
      const words = h1.split(/\s+/).filter(Boolean).length;
      const hasDesc = (p.meta.description || '').length > 20;
      if (h1 && words >= 2 && words <= 16 && hasDesc) return result('pass', `H1 is ${words} words and a meta description explains the offer.`, '', h1);
      if (!h1) return result('fail', 'No H1 found, so the main promise is unclear.', 'Add one H1 that names the outcome for the visitor, not just the company.');
      if (words < 2) return result('warn', `H1 is only “${h1}” — likely a brand name, not a promise.`, 'Pair the brand with the outcome: “LaunchGrade — grade your launch in 60 seconds”.');
      if (words > 16) return result('warn', `H1 is ${words} words; the promise is buried.`, 'Cut the H1 to one sentence under ~12 words.');
      return result('warn', 'H1 is present but the meta description is missing or too thin.', 'Write a 50–160 character description that repeats the outcome.');
    },
  },
  {
    id: 'conv.risk-reversal', category: 'conversion', weight: 1,
    title: 'Reverses the risk of clicking',
    run(p) {
      const found = SPAM_REDUCERS.find((s) => p.text.toLowerCase().includes(s));
      if (found) return result('pass', `Risk-reversal language found (“${found}”).`, '', found);
      return result('warn', 'No “no spam”, “free”, or “cancel anytime” reassurance found.', 'Put one short reassurance under the button: “Free. No spam. Unsubscribe anytime.”');
    },
  },

  // ── TRUST ─────────────────────────────────────────────────────────────────
  {
    id: 'trust.privacy', category: 'trust', weight: 3,
    title: 'Links a privacy policy',
    run(p) {
      const hit = p.allLinks.find((a) => /privacy/i.test(`${a.href} ${a.text}`));
      if (hit) return result('pass', 'Privacy policy link found.', '', hit.href);
      return result('fail', 'No privacy policy link found.', 'Publish a plain-language privacy page and link it in the footer and near every form.');
    },
  },
  {
    id: 'trust.terms', category: 'trust', weight: 2,
    title: 'Links terms of service',
    run(p) {
      const hit = p.allLinks.find((a) => /terms|conditions/i.test(`${a.href} ${a.text}`));
      if (hit) return result('pass', 'Terms link found.', '', hit.href);
      return result('warn', 'No terms link found.', 'Add a short terms page. It matters as soon as money changes hands.');
    },
  },
  {
    id: 'trust.about', category: 'trust', weight: 1,
    title: 'Explains who is behind the page',
    run(p) {
      const hit = p.allLinks.find((a) => /about|team|company|story/i.test(`${a.href} ${a.text}`));
      if (hit) return result('pass', `About/team link found (“${truncate(hit.text, 40)}”).`);
      return result('warn', 'No about or team link found.', 'Add a short “who we are” section. Anonymous launch pages convert worse.');
    },
  },
  {
    id: 'trust.social-presence', category: 'trust', weight: 1,
    title: 'Links a real social profile',
    run(p) {
      const hit = p.allLinks.find((a) => SOCIAL_HOSTS.some((h) => {
        try { return new URL(a.href).hostname.endsWith(h); } catch { return false; }
      }));
      if (hit) return result('pass', `Social profile linked (${new URL(hit.href).hostname}).`, '', hit.href);
      return result('warn', 'No social profile links found.', 'Link one active profile. An abandoned profile is worse than none.');
    },
  },
  {
    id: 'trust.security-txt', category: 'trust', weight: 1,
    title: 'Publishes a security contact',
    run(p) {
      const sec = p.extras.security;
      if (sec?.ok && /contact:/i.test(sec.body || '')) return result('pass', 'security.txt is published with a contact.', '', sec.url);
      if (sec?.ok) return result('warn', 'security.txt exists but has no Contact: line.', 'Add “Contact: mailto:security@yourdomain.com” and an expiry date.');
      return result('info', 'No /.well-known/security.txt (optional for launch pages).', 'Add one when you start handling accounts or payments.');
    },
  },
  {
    id: 'trust.copyright', category: 'trust', weight: 1,
    title: 'Shows a current footer',
    run(p) {
      const year = new Date().getFullYear();
      const m = p.text.match(/(?:©|copyright)\s*(\d{4})?/i);
      if (m && (!m[1] || Number(m[1]) >= year - 1)) return result('pass', `Footer copyright is current${m[1] ? ` (${m[1]})` : ''}.`);
      if (m) return result('warn', `Footer says ${m[1]}; it looks stale.`, `Update the copyright year to ${year}.`);
      return result('warn', 'No copyright/footer found.', 'Add a footer with company name, year and legal links.');
    },
  },

  // ── TECHNICAL ─────────────────────────────────────────────────────────────
  {
    id: 'tech.https', category: 'technical', weight: 3,
    title: 'Serves over HTTPS',
    run(p) {
      try {
        if (new URL(p.url).protocol === 'https:') return result('pass', 'Final URL is HTTPS.');
      } catch { /* fall through */ }
      return result('fail', 'Page is not served over HTTPS.', 'Enable HTTPS. Let’s Encrypt and every major host make this free.');
    },
  },
  {
    id: 'tech.status', category: 'technical', weight: 3,
    title: 'Returns a healthy status',
    run(p) {
      const code = Number(p.status);
      if (code >= 200 && code < 300) return result('pass', `Page returned HTTP ${code}.`);
      if (code === 401 || code === 403) return result('warn', `Page returned HTTP ${code} to an anonymous bot.`, 'Do not block link previews or AI crawlers you want to be recommended by.');
      if (code >= 300 && code < 400) return result('warn', `Page returned HTTP ${code}.`, 'Redirect to the final canonical URL instead of serving a redirect page.');
      return result('fail', `Page returned HTTP ${code}.`, 'Fix the route before launching it anywhere.');
    },
  },
  {
    id: 'tech.speed', category: 'technical', weight: 2,
    title: 'Loads the HTML quickly',
    run(p) {
      const ms = Number(p.ms) || 0;
      if (ms <= 1200) return result('pass', `HTML arrived in ${ms} ms.`);
      if (ms <= 3000) return result('warn', `HTML took ${ms} ms.`, 'Cache the page at the edge and remove render-blocking scripts from the head.');
      return result('fail', `HTML took ${ms} ms.`, 'Most visitors leave before this. Move to a static host/CDN and cut third-party scripts.');
    },
  },
  {
    id: 'tech.compression', category: 'technical', weight: 2,
    title: 'Compresses the response',
    run(p) {
      const enc = (p.headers?.['content-encoding'] || '').toLowerCase();
      if (/br|gzip|deflate|zstd/.test(enc)) return result('pass', `Content-Encoding: ${enc}.`);
      return result('warn', 'No gzip/brotli compression header seen.', 'Enable Brotli or gzip at your host/CDN. It is usually one toggle.');
    },
  },
  {
    id: 'tech.cache', category: 'technical', weight: 1,
    title: 'Sets cache headers',
    run(p) {
      const cc = (p.headers?.['cache-control'] || '').toLowerCase();
      if (/no-store/.test(cc)) return result('warn', 'Cache-Control says no-store.', 'Cache static HTML briefly and hash + cache assets for a year.');
      if (/max-age|s-maxage/.test(cc)) return result('pass', `Cache-Control: ${truncate(cc, 70)}.`);
      if (p.headers?.etag || p.headers?.['last-modified']) return result('pass', 'Validator headers (ETag/Last-Modified) are present.');
      return result('warn', 'No cache headers seen.', 'Add Cache-Control with a short max-age for HTML and immutable assets.');
    },
  },
  {
    id: 'tech.viewport', category: 'technical', weight: 2,
    title: 'Is mobile-ready',
    run(p) {
      const vp = (p.meta.viewport || '').toLowerCase();
      if (!vp) return result('fail', 'No viewport meta tag.', 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.');
      if (vp.includes('width=device-width') && !vp.includes('user-scalable=no')) return result('pass', 'Responsive viewport is configured.');
      if (vp.includes('user-scalable=no')) return result('warn', `Viewport disables zoom (“${truncate(vp, 60)}”).`, 'Remove user-scalable=no; it blocks accessibility zoom.');
      return result('warn', `Viewport is unusual (“${truncate(vp, 60)}”).`, 'Use width=device-width, initial-scale=1.');
    },
  },
  {
    id: 'tech.indexable', category: 'technical', weight: 2,
    title: 'Allows search indexing',
    run(p) {
      const robots = `${p.meta.robots || ''} ${p.headers?.['x-robots-tag'] || ''}`.toLowerCase();
      if (/noindex|none/.test(robots)) return result('fail', `Page asks not to be indexed (${truncate(robots.trim(), 60)}).`, 'Remove noindex unless this is a private page. Nobody can find a launch you hide.');
      return result('pass', 'No noindex directive found.');
    },
  },
  {
    id: 'tech.canonical', category: 'technical', weight: 2,
    title: 'Declares a canonical URL',
    run(p) {
      if (!p.canonical) return result('warn', 'No canonical link tag.', 'Add <link rel="canonical" href="https://yourdomain.com/"> to prevent duplicate-URL dilution.');
      if (/^https?:\/\//i.test(p.canonical)) return result('pass', `Canonical: ${truncate(p.canonical, 80)}.`, '', p.canonical);
      return result('warn', `Canonical is relative (“${p.canonical}”).`, 'Use an absolute canonical URL.');
    },
  },
  {
    id: 'tech.lang', category: 'technical', weight: 1,
    title: 'Declares the page language',
    run(p) {
      if (p.htmlTag.lang) return result('pass', `html lang="${p.htmlTag.lang}".`);
      return result('warn', 'The <html> tag has no lang attribute.', 'Add lang="en" (or your language) for screen readers and search.');
    },
  },
  {
    id: 'tech.favicon', category: 'technical', weight: 1,
    title: 'Has a favicon',
    run(p) {
      const icon = p.linkTags.find((l) => /icon/i.test(l.rel || ''));
      if (icon) return result('pass', `Favicon linked (${truncate(icon.href, 50)}).`);
      return result('warn', 'No favicon link found.', 'Add a 32×32 and 180×180 icon; browsers and tabs look unfinished without one.');
    },
  },
  {
    id: 'tech.mixed-content', category: 'technical', weight: 2,
    title: 'Avoids mixed content',
    run(p) {
      const bad = [];
      for (const name of ['script', 'img', 'iframe', 'source', 'video', 'audio', 'link']) {
        for (const tag of tags(p.html, name)) {
          const a = attrs(tag);
          const value = a.src || a.href || '';
          if (/^http:\/\//i.test(value) && !/localhost|127\.0\.0\.1|w3\.org|schema\.org/.test(value)) bad.push(value);
        }
      }
      if (!bad.length) return result('pass', 'No insecure http:// assets found.');
      return result('fail', `${bad.length} insecure asset${bad.length > 1 ? 's' : ''} found.`, `Serve every asset over HTTPS (first: ${truncate(bad[0], 60)}).`);
    },
  },
  {
    id: 'tech.analytics', category: 'technical', weight: 1,
    title: 'Measures visits',
    run(p) {
      const found = /(googletagmanager|google-analytics|gtag\(|plausible\.io|umami|posthog|segment\.(com|io)|matomo|fathom|clarity\.ms|cloudflareinsights|vercel\/insights|simpleanalytics)/i.test(p.html);
      if (found) return result('pass', 'An analytics script was detected.');
      return result('warn', 'No analytics detected.', 'Add privacy-friendly analytics (Plausible, Umami, or a simple counter) before you announce.');
    },
  },

  // ── SEO ───────────────────────────────────────────────────────────────────
  {
    id: 'seo.title', category: 'seo', weight: 3,
    title: 'Has a well-sized title',
    run(p) {
      const len = p.title.length;
      if (!len) return result('fail', 'No <title> tag.', 'Write a 10–60 character title: outcome + brand.');
      if (len >= 10 && len <= 60) return result('pass', `Title is ${len} characters.`, '', p.title);
      return result('warn', `Title is ${len} characters; search results truncate around 60.`, 'Keep the promise in the first 60 characters.');
    },
  },
  {
    id: 'seo.description', category: 'seo', weight: 3,
    title: 'Has a meta description',
    run(p) {
      const desc = p.meta.description || '';
      const len = desc.length;
      if (!len) return result('fail', 'No meta description.', 'Write 50–160 characters that sell the click, not the company.');
      if (len >= 50 && len <= 160) return result('pass', `Description is ${len} characters.`, '', desc);
      return result('warn', `Description is ${len} characters.`, 'Aim for 50–160 characters with the outcome and audience.');
    },
  },
  {
    id: 'seo.h1', category: 'seo', weight: 3,
    title: 'Has exactly one H1',
    run(p) {
      const h1s = p.allHeadings.filter((h) => h.level === 1 && h.text);
      if (h1s.length === 1) return result('pass', `One H1: “${truncate(h1s[0].text, 70)}”.`, '', h1s[0].text);
      if (!h1s.length) return result('fail', 'No H1 heading.', 'Make the main promise an H1. Do not hide it in a styled div.');
      return result('warn', `${h1s.length} H1 headings found.`, 'Keep one H1; demote the rest to H2.');
    },
  },
  {
    id: 'seo.heading-order', category: 'seo', weight: 1,
    title: 'Uses a sane heading outline',
    run(p) {
      if (!p.allHeadings.length) return result('fail', 'No headings found.', 'Structure the page with H1 → H2 → H3 so skimmers and crawlers can follow it.');
      let prev = 0;
      let jump = false;
      for (const h of p.allHeadings) {
        if (prev && h.level > prev + 1) jump = true;
        prev = h.level;
      }
      const h2s = p.allHeadings.filter((h) => h.level === 2).length;
      if (jump) return result('warn', 'Heading levels skip a step.', 'Do not jump from H1 to H3; use H2 for sections.');
      if (h2s >= 2) return result('pass', `${p.allHeadings.length} headings, ${h2s} H2 sections.`);
      return result('warn', `Only ${h2s} H2 section${h2s === 1 ? '' : 's'}.`, 'Break the page into 2–5 scannable H2 sections.');
    },
  },
  {
    id: 'seo.alt', category: 'seo', weight: 2,
    title: 'Describes its images',
    run(p) {
      const imgs = p.allImages.filter((i) => i.src);
      if (!imgs.length) return result('info', 'No images to check.');
      const withAlt = imgs.filter((i) => (i.alt || '').trim().length > 0).length;
      const ratio = pct(withAlt, imgs.length);
      if (ratio >= 90) return result('pass', `${withAlt}/${imgs.length} images have alt text.`);
      if (ratio >= 60) return result('warn', `${withAlt}/${imgs.length} images have alt text.`, 'Describe meaningful images; use alt="" for decoration.');
      return result('fail', `Only ${withAlt}/${imgs.length} images have alt text.`, 'Add concise alt text to every meaningful image.');
    },
  },
  {
    id: 'seo.sitemap', category: 'seo', weight: 2,
    title: 'Publishes a sitemap',
    run(p) {
      const s = p.extras.sitemap;
      if (s?.ok && /<urlset|<sitemapindex/i.test(s.body || '')) return result('pass', 'sitemap.xml is valid XML.', '', s.url);
      if (s?.ok) return result('warn', 'sitemap.xml returned something that is not a sitemap.', 'Generate a real XML sitemap, not an HTML 404 page.');
      return result('warn', 'No sitemap.xml found.', 'Generate /sitemap.xml and submit it in Google Search Console.');
    },
  },
  {
    id: 'seo.robots', category: 'seo', weight: 1,
    title: 'Publishes robots.txt',
    run(p) {
      const r = p.extras.robots;
      if (r?.ok && r.body?.trim()) {
        if (/^\s*disallow:\s*\/\s*$/im.test(r.body)) return result('fail', 'robots.txt disallows the whole site.', 'Allow public pages; block only private areas.');
        return result('pass', 'robots.txt is published.', '', r.url);
      }
      return result('warn', 'No robots.txt found.', 'Add a simple robots.txt that points to your sitemap.');
    },
  },
  {
    id: 'seo.schema', category: 'seo', weight: 2,
    title: 'Adds structured data',
    run(p) {
      const valid = p.ld.filter((x) => x['@type'] || x['@context']);
      const invalid = p.ld.filter((x) => x.__invalid);
      if (valid.length) {
        const types = [...new Set(valid.flatMap((x) => (Array.isArray(x['@type']) ? x['@type'] : [x['@type']])).filter(Boolean))];
        return result('pass', `JSON-LD found: ${types.slice(0, 4).join(', ') || 'schema'}.`, '', types.join(', '));
      }
      if (invalid.length) return result('warn', 'JSON-LD exists but does not parse.', 'Validate it with Google’s Rich Results Test.');
      return result('warn', 'No JSON-LD structured data.', 'Add Organization + WebSite (or Product/SoftwareApplication) schema in one script tag.');
    },
  },
  {
    id: 'seo.internal-links', category: 'seo', weight: 1,
    title: 'Links its own pages',
    run(p) {
      const internal = p.allLinks.filter((a) => a.href && !/^#|^mailto:|^tel:|^javascript:/i.test(a.href) && sameOrigin(a.href, p.url));
      if (internal.length >= 3) return result('pass', `${internal.length} internal links found.`);
      if (internal.length) return result('warn', `Only ${internal.length} internal link${internal.length === 1 ? '' : 's'}.`, 'Link pricing, about, and one proof page so crawlers can map the site.');
      return result('warn', 'No internal links found.', 'Add a footer with links to your key pages.');
    },
  },
  {
    id: 'seo.text-ratio', category: 'seo', weight: 1,
    title: 'Has readable copy in the HTML',
    run(p) {
      const ratio = p.bytes ? pct(p.text.length, p.bytes, 1) : 0;
      if (ratio >= 6) return result('pass', `${ratio}% of the HTML is readable text.`);
      if (ratio >= 2) return result('warn', `Only ${ratio}% of the HTML is readable text.`, 'Server-render the core copy; search and AI crawlers may not execute your JavaScript.');
      return result('fail', `Only ${ratio}% of the HTML is readable text.`, 'Ship server-rendered HTML. A blank shell is invisible to crawlers and agents.');
    },
  },

  // ── SOCIAL ────────────────────────────────────────────────────────────────
  {
    id: 'social.open-graph', category: 'social', weight: 3,
    title: 'Has a complete Open Graph card',
    run(p) {
      const need = ['og:title', 'og:description', 'og:image', 'og:url'];
      const have = need.filter((k) => p.meta[k]);
      if (have.length === 4) return result('pass', 'og:title, og:description, og:image and og:url are all set.', '', p.meta['og:image']);
      return result(have.length >= 2 ? 'warn' : 'fail', `Open Graph is missing ${need.filter((k) => !p.meta[k]).join(', ')}.`, 'Add all four tags; most chat and social previews use them.');
    },
  },
  {
    id: 'social.twitter', category: 'social', weight: 2,
    title: 'Has a Twitter/X card',
    run(p) {
      const card = p.meta['twitter:card'] || '';
      const image = p.meta['twitter:image'] || p.meta['twitter:image:src'] || '';
      if (card && image) return result('pass', `twitter:card=${card} with an image.`);
      if (card || image) return result('warn', 'Twitter card is incomplete.', 'Add twitter:card, twitter:title, twitter:description and twitter:image.');
      return result('warn', 'No Twitter/X card tags.', 'Add a summary_large_image card so shared links look designed.');
    },
  },
  {
    id: 'social.og-image-alt', category: 'social', weight: 1,
    title: 'Describes the share image',
    run(p) {
      if (!p.meta['og:image']) return result('info', 'No OG image to describe.');
      if (p.meta['og:image:alt']) return result('pass', 'og:image:alt is set.');
      return result('warn', 'OG image has no alt text.', 'Add og:image:alt for screen readers and low-bandwidth previews.');
    },
  },

  // ── ACCESSIBILITY ─────────────────────────────────────────────────────────
  {
    id: 'a11y.form-labels', category: 'a11y', weight: 2,
    title: 'Labels its form fields',
    run(p) {
      const fields = [];
      const isHoneypot = (i) => String(i.name || '').startsWith('_') || String(i.class || '').split(/\s+/).includes('hp') || String(i.tabindex || '') === '-1';
      for (const f of p.allForms) {
        for (const i of f.inputs) {
          const type = (i.type || 'text').toLowerCase();
          if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type) || isHoneypot(i)) continue;
          fields.push(i);
        }
        fields.push(...f.textareas, ...f.selects);
      }
      if (!fields.length) return result('info', 'No form fields to check.');
      const labelled = fields.filter((i) => i['aria-label'] || i['aria-labelledby'] || (i.id && new RegExp(`<label[^>]*for=["']${escapeRe(i.id)}["']`, 'i').test(p.html)) || i.placeholder || i.title);
      if (labelled.length === fields.length) return result('pass', `${fields.length}/${fields.length} fields are labelled.`);
      return result('warn', `${labelled.length}/${fields.length} fields are labelled.`, 'Add a visible <label> (or aria-label) to every field. Placeholders disappear as you type.');
    },
  },
  {
    id: 'a11y.button-names', category: 'a11y', weight: 2,
    title: 'Gives buttons accessible names',
    run(p) {
      const buttons = p.buttons || [];
      if (!buttons.length) return result('info', 'No buttons found.');
      const unnamed = buttons.filter((b) => !(b.text || '').trim() && !b['aria-label'] && !b.title && !b.value);
      if (!unnamed.length) return result('pass', `${buttons.length} button${buttons.length > 1 ? 's have' : ' has'} a name.`);
      return result('fail', `${unnamed.length} button${unnamed.length > 1 ? 's have' : ' has'} no text or aria-label.`, 'Give every button visible text or an aria-label.');
    },
  },
  {
    id: 'a11y.link-text', category: 'a11y', weight: 1,
    title: 'Writes descriptive link text',
    run(p) {
      const vague = p.allLinks.filter((a) => /^(click here|here|read more|more|learn more|this)$/i.test((a.text || '').trim()));
      if (!vague.length) return result('pass', 'No vague link text found.');
      return result('warn', `${vague.length} vague link${vague.length > 1 ? 's' : ''} (“${truncate(vague[0].text, 20)}”).`, 'Say where the link goes: “Read the pricing guide”, not “click here”.');
    },
  },
  {
    id: 'a11y.landmarks', category: 'a11y', weight: 1,
    title: 'Uses landmark elements',
    run(p) {
      const hasMain = /<main\b/i.test(p.html);
      const hasNav = /<nav\b/i.test(p.html);
      if (hasMain && hasNav) return result('pass', 'main and nav landmarks are present.');
      if (hasMain || hasNav) return result('warn', `Only ${hasMain ? 'main' : 'nav'} landmark found.`, 'Wrap the primary content in <main> and navigation in <nav>.');
      return result('fail', 'No main or nav landmarks.', 'Use semantic <main> and <nav> so screen-reader users can jump around.');
    },
  },
  {
    id: 'a11y.zoom', category: 'a11y', weight: 1,
    title: 'Allows pinch-zoom',
    run(p) {
      const vp = (p.meta.viewport || '').toLowerCase();
      if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?!\d)/.test(vp)) return result('fail', 'Viewport blocks zoom.', 'Remove user-scalable=no and maximum-scale=1.');
      return result('pass', 'Zoom is not blocked.');
    },
  },
  {
    id: 'a11y.skip-link', category: 'a11y', weight: 1,
    title: 'Offers a skip link',
    run(p) {
      const hit = p.allLinks.find((a) => /^#(main|content|skip)/i.test(a.href) && /skip/i.test(a.text));
      if (hit) return result('pass', 'Skip-to-content link found.', '', hit.href);
      return result('info', 'No skip link (nice-to-have for long pages).', 'Add “Skip to content” as the first focusable element.');
    },
  },

  // ── AI-AGENT READINESS ────────────────────────────────────────────────────
  {
    id: 'agent.llms-txt', category: 'agent', weight: 3,
    title: 'Publishes llms.txt',
    run(p) {
      const l = p.extras.llms;
      if (l?.ok && /^\s*#\s+/m.test(l.body || '') && (l.body || '').length > 30) return result('pass', 'llms.txt is published with a title and content.', '', l.url);
      if (l?.ok) return result('warn', 'llms.txt exists but does not look like the llms.txt format.', 'Start with “# Your product”, one-line description, then links to key pages.');
      return result('fail', 'No /llms.txt found.', 'Add /llms.txt so AI agents get a clean map of your product instead of guessing from HTML.');
    },
  },
  {
    id: 'agent.llms-full', category: 'agent', weight: 1,
    title: 'Offers a full-context file',
    run(p) {
      const l = p.extras.llmsFull;
      if (l?.ok && (l.body || '').length > 100) return result('pass', `llms-full.txt is available (${kb(l.bytes)}).`, '', l.url);
      return result('info', 'No llms-full.txt (optional).', 'Add the long-form version if agents need your docs in one request.');
    },
  },
  {
    id: 'agent.robots-ai', category: 'agent', weight: 2,
    title: 'Lets AI crawlers in',
    run(p) {
      const r = p.extras.robots;
      if (!r?.ok || !r.body?.trim()) return result('warn', 'No robots.txt, so AI crawler access is undefined.', 'Publish robots.txt and explicitly allow the agents you want citations from.');
      const blocked = AI_BOTS.filter((bot) => isBlocked(r.body, bot));
      if (!blocked.length) return result('pass', `All ${AI_BOTS.length} major AI/search crawlers are allowed.`);
      if (blocked.length === AI_BOTS.length) return result('fail', 'robots.txt blocks every major AI crawler.', 'Allow at least the assistants you want to be recommended by (GPTBot, ClaudeBot, PerplexityBot).');
      return result('warn', `Blocked: ${blocked.join(', ')}.`, 'Decide deliberately which AI crawlers may read the page; blocking all removes you from AI answers.');
    },
  },
  {
    id: 'agent.agents-md', category: 'agent', weight: 1,
    title: 'Speaks to coding agents',
    run(p) {
      const a = p.extras.agents?.ok ? p.extras.agents : p.extras.agentsUpper;
      if (a?.ok && (a.body || '').length > 20) return result('pass', 'AGENTS.md is published.', '', a.url);
      return result('info', 'No AGENTS.md (emerging convention).', 'Add AGENTS.md if developers or coding agents integrate with your product.');
    },
  },
  {
    id: 'agent.markdown', category: 'agent', weight: 1,
    title: 'Serves markdown to agents',
    run(p) {
      const alt = p.linkTags.find((l) => /alternate/i.test(l.rel || '') && /text\/markdown/i.test(l.type || ''));
      if (p.extras.markdown?.markdown) return result('pass', `Content negotiation works (${p.extras.markdown.contentType.split(';')[0]}).`);
      if (alt) return result('pass', 'A markdown alternate is linked.', '', alt.href);
      return result('info', 'No markdown alternate or content negotiation.', 'Optional: serve text/markdown when Accept asks for it, or link a .md alternate.');
    },
  },
  {
    id: 'agent.mcp', category: 'agent', weight: 1,
    title: 'Exposes a machine-readable API',
    run(p) {
      const mcp = p.extras.mcp;
      const openapi = p.extras.openapi;
      if (mcp?.ok && /json/i.test(mcp.contentType || '')) return result('pass', 'MCP descriptor found at /.well-known/mcp.json.', '', mcp.url);
      if (openapi?.ok && /json|yaml/i.test(openapi.contentType || '')) return result('pass', 'OpenAPI descriptor found.', '', openapi.url);
      return result('info', 'No MCP/OpenAPI descriptor (only needed if agents can act on your product).', 'Publish a descriptor when you ship an API or MCP server.');
    },
  },
  {
    id: 'agent.faq', category: 'agent', weight: 2,
    title: 'Answers buying questions',
    run(p) {
      const hasFaqSchema = p.ld.some((x) => String(x['@type'] || '').toLowerCase().includes('faq'));
      const questionHeadings = p.allHeadings.filter((h) => h.text.includes('?')).length;
      if (hasFaqSchema) return result('pass', 'FAQPage structured data is present.');
      if (questionHeadings >= 2) return result('pass', `${questionHeadings} question headings found.`);
      return result('warn', 'No FAQ section or FAQ schema found.', 'Add 3–5 real objections (“Is it free?”, “How long does it take?”) and FAQPage schema.');
    },
  },
  {
    id: 'agent.semantic-html', category: 'agent', weight: 1,
    title: 'Uses semantic HTML',
    run(p) {
      const hasMain = /<main\b/i.test(p.html);
      const hasArticle = /<article\b/i.test(p.html);
      const hasNav = /<nav\b/i.test(p.html);
      const score = [hasMain, hasArticle, hasNav].filter(Boolean).length;
      if (score >= 2) return result('pass', 'Semantic main/article/nav structure found.');
      if (score === 1) return result('warn', 'Only one semantic landmark found.', 'Use main, nav and article/section so agents can extract the important parts.');
      return result('fail', 'No semantic landmarks found.', 'Replace div soup with header, nav, main, article and footer.');
    },
  },
  {
    id: 'agent.no-js-copy', category: 'agent', weight: 2,
    title: 'Works without JavaScript',
    run(p) {
      const len = p.text.length;
      if (len >= 800) return result('pass', `${len} characters of copy are in the HTML.`);
      if (len >= 250) return result('warn', `Only ${len} characters of copy are in the HTML.`, 'Server-render the headline, offer, proof and FAQ. Many agents do not run JS.');
      return result('fail', `Only ${len} characters of copy are in the HTML.`, 'Pre-render or statically generate the page; a JS-only shell is invisible to crawlers.');
    },
  },
];

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Very small robots.txt parser: is `bot` blocked from the root? */
export function isBlocked(robots, bot) {
  const lines = String(robots).split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);
  let agents = [];
  let directives = [];
  const groups = [];
  let seenDirective = false;
  for (const line of lines) {
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (seenDirective) {
        groups.push({ agents, directives });
        agents = [];
        directives = [];
        seenDirective = false;
      }
      agents.push(value.toLowerCase());
    } else {
      seenDirective = true;
      directives.push({ key, value });
    }
  }
  if (agents.length) groups.push({ agents, directives });

  const exact = groups.filter((g) => g.agents.includes(bot.toLowerCase()));
  const wildcard = groups.filter((g) => g.agents.includes('*'));
  const relevant = exact.length ? exact : wildcard;
  if (!relevant.length) return false;
  let blocked = false;
  for (const g of relevant) {
    for (const d of g.directives) {
      if (d.key === 'disallow' && /^\/\*?$/.test(d.value)) blocked = true;
      if (d.key === 'allow' && (d.value === '/' || d.value === '/*')) blocked = false;
    }
  }
  return blocked;
}

export function runChecks(ctx, { ignore = [] } = {}) {
  const p = prepare({ ...ctx, status: ctx.status, headers: ctx.headers, ms: ctx.ms, bytes: ctx.bytes });
  const ignored = new Set(ignore);
  return CHECKS.map((check) => {
    const base = { id: check.id, category: check.category, weight: check.weight, title: check.title };
    if (ignored.has(check.id)) {
      return { ...base, status: 'skipped', detail: 'Ignored by --ignore.', fix: '' };
    }
    try {
      const r = check.run(p);
      return { ...base, ...r };
    } catch (error) {
      return { ...base, status: 'error', detail: `Check failed to run: ${error.message}`, fix: 'Please report this at github.com/fastpresspages/launchgrade/issues.' };
    }
  });
}
