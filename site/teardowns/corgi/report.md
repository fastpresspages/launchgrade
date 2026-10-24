# LaunchGrade: corgi.computer

> **D+ · 53/100 — Not ready**
>
> `https://corgi.computer/`  
> Scanned Sat, 24 Oct 2026 13:44:42 GMT · 768 ms · 1.4 MB HTML

**20 pass · 19 warn · 7 fail · 8 info**

| Category | Score | Weight | Status |
| --- | ---: | ---: | --- |
| Conversion | 37/100 | 25% | 1✓ 4! 2× |
| Trust | 38/100 | 15% | 1✓ 3! 1× |
| Technical | 90/100 | 20% | 10✓ 3! 0× |
| SEO | 55/100 | 15% | 3✓ 5! 2× |
| Social sharing | 20/100 | 10% | 0✓ 1! 1× |
| Accessibility | 90/100 | 5% | 3✓ 1! 0× |
| AI-agent readiness | 55/100 | 10% | 2✓ 2! 1× |

## Fix these first

1. ❌ **Has a complete Open Graph card** (Social sharing)
   - Open Graph is missing og:title, og:description, og:image, og:url.
   - **Fix:** Add all four tags; most chat and social previews use them.
2. ❌ **Links a privacy policy** (Trust)
   - No privacy policy link found.
   - **Fix:** Publish a plain-language privacy page and link it in the footer and near every form.
3. ❌ **Has an email capture** (Conversion)
   - No email capture found. A launch page without a capture is a poster, not a funnel.
   - **Fix:** Add one email field and one button above the fold. Keep it to one step.
4. ❌ **Has a specific call to action** (Conversion)
   - No recognizable call to action.
   - **Fix:** Add one primary button above the fold with a verb and a concrete outcome.
5. ❌ **Publishes llms.txt** (AI-agent readiness)
   - No /llms.txt found.
   - **Fix:** Add /llms.txt so AI agents get a clean map of your product instead of guessing from HTML.
6. ❌ **Describes its images** (SEO)
   - Only 0/12 images have alt text.
   - **Fix:** Add concise alt text to every meaningful image.
7. ❌ **Has readable copy in the HTML** (SEO)
   - Only 0.1% of the HTML is readable text.
   - **Fix:** Ship server-rendered HTML. A blank shell is invisible to crawlers and agents.
8. ⚠️ **Has a Twitter/X card** (Social sharing)
   - No Twitter/X card tags.
   - **Fix:** Add a summary_large_image card so shared links look designed.
9. ⚠️ **Links terms of service** (Trust)
   - No terms link found.
   - **Fix:** Add a short terms page. It matters as soon as money changes hands.
10. ⚠️ **Keeps signup friction low** (Conversion)
   - No form to evaluate.
   - **Fix:** Start with a single email field.

<details>
<summary>All 54 checks</summary>

### Conversion

- ❌ **Has an email capture** — No email capture found. A launch page without a capture is a poster, not a funnel.
  - *Fix:* Add one email field and one button above the fold. Keep it to one step.
- ❌ **Has a specific call to action** — No recognizable call to action.
  - *Fix:* Add one primary button above the fold with a verb and a concrete outcome.
- ✅ **Shows social proof** — Social proof language found (“review”).
- ⚠️ **Keeps signup friction low** — No form to evaluate.
  - *Fix:* Start with a single email field.
- ⚠️ **Offers a human contact path** — No email or contact link found.
  - *Fix:* Add a real email or a contact page. Buyers check for a human before they convert.
- ⚠️ **States a clear value proposition** — H1 is only “corgi” — likely a brand name, not a promise.
  - *Fix:* Pair the brand with the outcome: “LaunchGrade — grade your launch in 60 seconds”.
- ⚠️ **Reverses the risk of clicking** — No “no spam”, “free”, or “cancel anytime” reassurance found.
  - *Fix:* Put one short reassurance under the button: “Free. No spam. Unsubscribe anytime.”

### Trust

- ❌ **Links a privacy policy** — No privacy policy link found.
  - *Fix:* Publish a plain-language privacy page and link it in the footer and near every form.
- ⚠️ **Links terms of service** — No terms link found.
  - *Fix:* Add a short terms page. It matters as soon as money changes hands.
- ⚠️ **Explains who is behind the page** — No about or team link found.
  - *Fix:* Add a short “who we are” section. Anonymous launch pages convert worse.
- ✅ **Links a real social profile** — Social profile linked (github.com).
- ℹ️ **Publishes a security contact** — No /.well-known/security.txt (optional for launch pages).
- ⚠️ **Shows a current footer** — No copyright/footer found.
  - *Fix:* Add a footer with company name, year and legal links.

### Technical

- ✅ **Serves over HTTPS** — Final URL is HTTPS.
- ✅ **Returns a healthy status** — Page returned HTTP 200.
- ✅ **Loads the HTML quickly** — HTML arrived in 768 ms.
- ✅ **Compresses the response** — Content-Encoding: zstd.
- ✅ **Sets cache headers** — Cache-Control: public, max-age=0, must-revalidate.
- ✅ **Is mobile-ready** — Responsive viewport is configured.
- ✅ **Allows search indexing** — No noindex directive found.
- ⚠️ **Declares a canonical URL** — No canonical link tag.
  - *Fix:* Add <link rel="canonical" href="https://yourdomain.com/"> to prevent duplicate-URL dilution.
- ✅ **Declares the page language** — html lang="en".
- ✅ **Has a favicon** — Favicon linked (data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEA…).
- ✅ **Avoids mixed content** — No insecure http:// assets found.
- ⚠️ **Measures visits** — No analytics detected.
  - *Fix:* Add privacy-friendly analytics (Plausible, Umami, or a simple counter) before you announce.
- ⚠️ **Defines image dimensions** — 12/12 images are missing valid width and height attributes.
  - *Fix:* Add explicit width and height attributes to images to help prevent layout shifts.

### SEO

- ⚠️ **Has a well-sized title** — Title is 5 characters; search results truncate around 60.
  - *Fix:* Keep the promise in the first 60 characters.
- ⚠️ **Has a meta description** — Description is 32 characters.
  - *Fix:* Aim for 50–160 characters with the outcome and audience.
- ✅ **Has exactly one H1** — One H1: “corgi”.
- ✅ **Uses a sane heading outline** — 18 headings, 16 H2 sections.
- ❌ **Describes its images** — Only 0/12 images have alt text.
  - *Fix:* Add concise alt text to every meaningful image.
- ⚠️ **Publishes a sitemap** — No sitemap.xml found.
  - *Fix:* Generate /sitemap.xml and submit it in Google Search Console.
- ✅ **Publishes robots.txt** — robots.txt is published.
- ⚠️ **Adds structured data** — No JSON-LD structured data.
  - *Fix:* Add Organization + WebSite (or Product/SoftwareApplication) schema in one script tag.
- ⚠️ **Links its own pages** — No internal links found.
  - *Fix:* Add a footer with links to your key pages.
- ❌ **Has readable copy in the HTML** — Only 0.1% of the HTML is readable text.
  - *Fix:* Ship server-rendered HTML. A blank shell is invisible to crawlers and agents.

### Social sharing

- ❌ **Has a complete Open Graph card** — Open Graph is missing og:title, og:description, og:image, og:url.
  - *Fix:* Add all four tags; most chat and social previews use them.
- ⚠️ **Has a Twitter/X card** — No Twitter/X card tags.
  - *Fix:* Add a summary_large_image card so shared links look designed.
- ℹ️ **Describes the share image** — No OG image to describe.

### Accessibility

- ℹ️ **Labels its form fields** — No form fields to check.
- ✅ **Gives buttons accessible names** — 7 buttons have a name.
- ✅ **Writes descriptive link text** — No vague link text found.
- ⚠️ **Uses landmark elements** — Only main landmark found.
  - *Fix:* Wrap the primary content in <main> and navigation in <nav>.
- ✅ **Allows pinch-zoom** — Zoom is not blocked.
- ℹ️ **Offers a skip link** — No skip link (nice-to-have for long pages).

### AI-agent readiness

- ❌ **Publishes llms.txt** — No /llms.txt found.
  - *Fix:* Add /llms.txt so AI agents get a clean map of your product instead of guessing from HTML.
- ℹ️ **Offers a full-context file** — No llms-full.txt (optional).
- ✅ **Lets AI crawlers in** — All 6 major AI/search crawlers are allowed.
- ℹ️ **Speaks to coding agents** — No AGENTS.md (emerging convention).
- ℹ️ **Serves markdown to agents** — No markdown alternate or content negotiation.
- ℹ️ **Exposes a machine-readable API** — No MCP/OpenAPI descriptor (only needed if agents can act on your product).
- ⚠️ **Answers buying questions** — No FAQ section or FAQ schema found.
  - *Fix:* Add 3–5 real objections (“Is it free?”, “How long does it take?”) and FAQPage schema.
- ⚠️ **Uses semantic HTML** — Only one semantic landmark found.
  - *Fix:* Use main, nav and article/section so agents can extract the important parts.
- ✅ **Works without JavaScript** — 1917 characters of copy are in the HTML.

</details>

---
Generated by [LaunchGrade](https://github.com/fastpresspages/launchgrade) — the open-source launch audit. Zero dependencies.