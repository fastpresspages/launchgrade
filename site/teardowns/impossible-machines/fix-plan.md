# Fix plan for impossiblemachines.xyz

Current grade: **D+ (54/100)**. Target: **A (90+)**.

Work top to bottom. Re-run `launchgrade` after each batch and keep the report in the repo so the grade is visible.

## 1. Has a complete Open Graph card

- **Why:** Open Graph is missing og:title, og:description, og:image, og:url.
- **Fix:** Add all four tags; most chat and social previews use them.
- **Check:** `social.open-graph` (Social sharing)

## 2. Links a privacy policy

- **Why:** No privacy policy link found.
- **Fix:** Publish a plain-language privacy page and link it in the footer and near every form.
- **Check:** `trust.privacy` (Trust)

## 3. Has an email capture

- **Why:** No email capture found. A launch page without a capture is a poster, not a funnel.
- **Fix:** Add one email field and one button above the fold. Keep it to one step.
- **Check:** `conv.email-capture` (Conversion)

## 4. Has a specific call to action

- **Why:** No recognizable call to action.
- **Fix:** Add one primary button above the fold with a verb and a concrete outcome.
- **Check:** `conv.cta` (Conversion)

## 5. Publishes llms.txt

- **Why:** No /llms.txt found.
- **Fix:** Add /llms.txt so AI agents get a clean map of your product instead of guessing from HTML.
- **Check:** `agent.llms-txt` (AI-agent readiness)

## 6. Gives buttons accessible names

- **Why:** 1 button has no text or aria-label.
- **Fix:** Give every button visible text or an aria-label.
- **Check:** `a11y.button-names` (Accessibility)

## 7. Has a Twitter/X card

- **Why:** No Twitter/X card tags.
- **Fix:** Add a summary_large_image card so shared links look designed.
- **Check:** `social.twitter` (Social sharing)

## 8. Links terms of service

- **Why:** No terms link found.
- **Fix:** Add a short terms page. It matters as soon as money changes hands.
- **Check:** `trust.terms` (Trust)

## 9. Shows social proof

- **Why:** No testimonials, customer logos or “trusted by” line found.
- **Fix:** Add one specific quote with a name and role, or a row of recognizable customer logos.
- **Check:** `conv.social-proof` (Conversion)

## 10. Keeps signup friction low

- **Why:** No form to evaluate.
- **Fix:** Start with a single email field.
- **Check:** `conv.friction` (Conversion)

## 11. Offers a human contact path

- **Why:** No email or contact link found.
- **Fix:** Add a real email or a contact page. Buyers check for a human before they convert.
- **Check:** `conv.contact` (Conversion)

## 12. Lets AI crawlers in

- **Why:** No robots.txt, so AI crawler access is undefined.
- **Fix:** Publish robots.txt and explicitly allow the agents you want citations from.
- **Check:** `agent.robots-ai` (AI-agent readiness)
