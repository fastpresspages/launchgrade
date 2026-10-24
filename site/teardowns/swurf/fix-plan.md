# Fix plan for swurf.org

Current grade: **C+ (65/100)**. Target: **A (90+)**.

Work top to bottom. Re-run `launchgrade` after each batch and keep the report in the repo so the grade is visible.

## 1. Links a privacy policy

- **Why:** No privacy policy link found.
- **Fix:** Publish a plain-language privacy page and link it in the footer and near every form.
- **Check:** `trust.privacy` (Trust)

## 2. Has an email capture

- **Why:** No email capture found. A launch page without a capture is a poster, not a funnel.
- **Fix:** Add one email field and one button above the fold. Keep it to one step.
- **Check:** `conv.email-capture` (Conversion)

## 3. Gives buttons accessible names

- **Why:** 1 button has no text or aria-label.
- **Fix:** Give every button visible text or an aria-label.
- **Check:** `a11y.button-names` (Accessibility)

## 4. Works without JavaScript

- **Why:** Only 229 characters of copy are in the HTML.
- **Fix:** Pre-render or statically generate the page; a JS-only shell is invisible to crawlers.
- **Check:** `agent.no-js-copy` (AI-agent readiness)

## 5. Publishes robots.txt

- **Why:** robots.txt disallows the whole site.
- **Fix:** Allow public pages; block only private areas.
- **Check:** `seo.robots` (SEO)

## 6. Has a specific call to action

- **Why:** Only a vague CTA found (“Submit a link”). “Learn more” asks for nothing.
- **Fix:** Use one verb and one outcome: “Get my free audit”, “Start free”, “Join the waitlist”.
- **Check:** `conv.cta` (Conversion)

## 7. Links terms of service

- **Why:** No terms link found.
- **Fix:** Add a short terms page. It matters as soon as money changes hands.
- **Check:** `trust.terms` (Trust)

## 8. Shows social proof

- **Why:** No testimonials, customer logos or “trusted by” line found.
- **Fix:** Add one specific quote with a name and role, or a row of recognizable customer logos.
- **Check:** `conv.social-proof` (Conversion)

## 9. Keeps signup friction low

- **Why:** No form to evaluate.
- **Fix:** Start with a single email field.
- **Check:** `conv.friction` (Conversion)

## 10. Offers a human contact path

- **Why:** No email or contact link found.
- **Fix:** Add a real email or a contact page. Buyers check for a human before they convert.
- **Check:** `conv.contact` (Conversion)

## 11. Has a Twitter/X card

- **Why:** Twitter card is incomplete.
- **Fix:** Add twitter:card, twitter:title, twitter:description and twitter:image.
- **Check:** `social.twitter` (Social sharing)

## 12. Lets AI crawlers in

- **Why:** Blocked: GPTBot, ClaudeBot, Google-Extended, CCBot.
- **Fix:** Decide deliberately which AI crawlers may read the page; blocking all removes you from AI answers.
- **Check:** `agent.robots-ai` (AI-agent readiness)
