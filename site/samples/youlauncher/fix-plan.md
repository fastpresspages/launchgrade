# Fix plan for fastpresspages.github.io

Current grade: **B- (71/100)**. Target: **A (90+)**.

Work top to bottom. Re-run `launchgrade` after each batch and keep the report in the repo so the grade is visible.

## 1. Has a complete Open Graph card

- **Why:** Open Graph is missing og:title, og:description, og:image, og:url.
- **Fix:** Add all four tags; most chat and social previews use them.
- **Check:** `social.open-graph` (Social sharing)

## 2. Links a privacy policy

- **Why:** No privacy policy link found.
- **Fix:** Publish a plain-language privacy page and link it in the footer and near every form.
- **Check:** `trust.privacy` (Trust)

## 3. Publishes llms.txt

- **Why:** No /llms.txt found.
- **Fix:** Add /llms.txt so AI agents get a clean map of your product instead of guessing from HTML.
- **Check:** `agent.llms-txt` (AI-agent readiness)

## 4. Has a Twitter/X card

- **Why:** No Twitter/X card tags.
- **Fix:** Add a summary_large_image card so shared links look designed.
- **Check:** `social.twitter` (Social sharing)

## 5. Links terms of service

- **Why:** No terms link found.
- **Fix:** Add a short terms page. It matters as soon as money changes hands.
- **Check:** `trust.terms` (Trust)

## 6. Offers a human contact path

- **Why:** No email or contact link found.
- **Fix:** Add a real email or a contact page. Buyers check for a human before they convert.
- **Check:** `conv.contact` (Conversion)

## 7. Lets AI crawlers in

- **Why:** No robots.txt, so AI crawler access is undefined.
- **Fix:** Publish robots.txt and explicitly allow the agents you want citations from.
- **Check:** `agent.robots-ai` (AI-agent readiness)

## 8. Answers buying questions

- **Why:** No FAQ section or FAQ schema found.
- **Fix:** Add 3–5 real objections (“Is it free?”, “How long does it take?”) and FAQPage schema.
- **Check:** `agent.faq` (AI-agent readiness)

## 9. Explains who is behind the page

- **Why:** No about or team link found.
- **Fix:** Add a short “who we are” section. Anonymous launch pages convert worse.
- **Check:** `trust.about` (Trust)

## 10. Links a real social profile

- **Why:** No social profile links found.
- **Fix:** Link one active profile. An abandoned profile is worse than none.
- **Check:** `trust.social-presence` (Trust)

## 11. Declares a canonical URL

- **Why:** No canonical link tag.
- **Fix:** Add <link rel="canonical" href="https://yourdomain.com/"> to prevent duplicate-URL dilution.
- **Check:** `tech.canonical` (Technical)

## 12. Publishes a sitemap

- **Why:** No sitemap.xml found.
- **Fix:** Generate /sitemap.xml and submit it in Google Search Console.
- **Check:** `seo.sitemap` (SEO)
