# Fix plan for corgi.computer

Current grade: **D+ (53/100)**. Target: **A (90+)**.

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

## 6. Describes its images

- **Why:** Only 0/12 images have alt text.
- **Fix:** Add concise alt text to every meaningful image.
- **Check:** `seo.alt` (SEO)

## 7. Has readable copy in the HTML

- **Why:** Only 0.1% of the HTML is readable text.
- **Fix:** Ship server-rendered HTML. A blank shell is invisible to crawlers and agents.
- **Check:** `seo.text-ratio` (SEO)

## 8. Has a Twitter/X card

- **Why:** No Twitter/X card tags.
- **Fix:** Add a summary_large_image card so shared links look designed.
- **Check:** `social.twitter` (Social sharing)

## 9. Links terms of service

- **Why:** No terms link found.
- **Fix:** Add a short terms page. It matters as soon as money changes hands.
- **Check:** `trust.terms` (Trust)

## 10. Keeps signup friction low

- **Why:** No form to evaluate.
- **Fix:** Start with a single email field.
- **Check:** `conv.friction` (Conversion)

## 11. Offers a human contact path

- **Why:** No email or contact link found.
- **Fix:** Add a real email or a contact page. Buyers check for a human before they convert.
- **Check:** `conv.contact` (Conversion)

## 12. States a clear value proposition

- **Why:** H1 is only “corgi” — likely a brand name, not a promise.
- **Fix:** Pair the brand with the outcome: “LaunchGrade — grade your launch in 60 seconds”.
- **Check:** `conv.value-prop` (Conversion)
