# Agent 9 — committed shotlist

## Recording contract

Target: 50–60 seconds; 1920×1080 and 1080×1920 exports. Opening products card 0–6s; nine scenes in the specified order; final HeySalad slate 4s. Each product scene is nominally 5.2s: ~1s BEFORE, ~2s real action, then at least ~2s readable proof. Budget: 6 + 9×5.2 + 4 = 56.8s. Actual natural voice durations determine the proof holds and are checked against the 60s ceiling.

Headed Chromium at 1920×1200, Playwright recordVideo, one source file per scene. No camera motion, digital zoom, CSS zoom, animated crop, cursor highlight/jitter, captions, subtitles or music. Ink/black on white; original HeySalad logo upper left; no pink background panels. Exports use fixed crops; vertical is centred on the main content, excluding the left navigation. No dashboard.stripe.com navigation. APP_URL and API keys come from the ignored demo/.env or environment, never committed or logged.

All actions must originate from a visible chat submission in the real app. New scene-specific state is shown as a pending request before submission; existing historical Stripe objects are not represented as empty. Each AFTER proof is the newly created/updated Stripe object, read back from Stripe with test-mode assertion, id and status in the app's Stripe output panel. No mock responses, DOM-fabricated object results, fabricated balances or SDK fallback labelled as Toolkit. Pending means the requested action has not happened; it does not mean an existing account has no objects.

## Scenes

| Scene / product | BEFORE (about 1s) | ACTION, triggered in chat (about 2s in edit) | AFTER proof held while product is named | Voiceover (≤12 words) | Target |
| --- | --- | --- | --- | --- | --- |
| Opening / products card | White card with official unmodified Stripe wordmark and nine simple ink icons, in product order | None | Agent 9 title and all nine products remain visible | Agent 9 gives your agent a financial operating system, built on the Stripe tools every business should use. | 6s |
| 01 / PaymentIntents | Restock request ready; no payment for this request | `restock` → deterministic basket and test PaymentIntent | New `pi_` object, `livemode: false`, `status: succeeded`, amount/currency | PaymentIntents confirms your supplier payment. | ~5.2s |
| 02 / Checkout | Customer checkout request ready; no Session for this request | `create a checkout for the kitchen order` → new test Checkout Session | New `cs_test_` object, `status: open`, `payment_status: unpaid`, hosted Checkout link. Claim ready, never paid. | Checkout prepares your customer's secure payment. | ~5.2s |
| 03 / Payment Links | Group booking request ready; no deposit link for this booking | `table for 6 Saturday 8pm` → deposit price and Payment Link | New `plink_` object, `active: true`, `livemode: false`; deposit requested, not collected | Payment Links prepares your booking deposits. | ~5.2s |
| 04 / Invoicing | Customer invoice request ready; no invoice for this request | `prepare an invoice for Agent Nine Demo 120 for catering` → create draft | New `in_` object, `status: draft`, total/currency. No invoice email sent. | Invoicing turns completed work into bills. | ~5.2s |
| 05 / Issuing | Existing test virtual card with actual £50 limit; £80 request pending | `try eighty pounds at Ocado on the card` → real test-helper authorization | New `iauth_` with `approved: false` and decline reason, plus real `ic_` spending limit. A card authorization status can be closed; approval false is the decline proof. Reject policy-only simulation. | Issuing keeps your agent within budget. | ~5.2s |
| 06 / Connect | Venue payment request pending; existing connected account accurately shown | `pay the venue sixty pounds` → destination charge with platform fee | New succeeded `pi_`, actual connected `acct_` destination and `tr_` transfer / fee evidence from expanded charge | Connect pays partners and records fees. | ~5.2s |
| 07 / Billing | Subscription request pending; no subscription for this request | `start a Sally Plus subscription` → create test subscription | New `sub_`, `status: active`, actual recurring price and latest invoice | Billing starts your customer's recurring subscription. | ~5.2s |
| 08 / Shared payment tokens | Scoped payment request pending; no token for this request | `pay nine pounds sixty with a shared payment token` → grant test token and spend within limit | New succeeded `pi_` with shared-payment-token linkage and amount/currency; token identifier only, never sensitive token payload. If token read-back is unavailable, show actual returned token id alongside verified PaymentIntent. | Shared payment tokens keep card details private. | ~5.5s |
| 09 / Agent Toolkit | Draft invoice request pending; Toolkit execution not yet claimed | `use Agent Toolkit to prepare an invoice for Agent Nine Tools 75 for services` → real Toolkit API write | New Stripe `in_`, `status: draft`, plus actual audit `via: agent-toolkit` and operation names. Toolkit has no independent Stripe object prefix; its created invoice and execution provenance are the proof. Fail if execution falls back to SDK. | Agent Toolkit creates invoices through Stripe's tools. | ~5.5s |
| Closing / end slate | White with original HeySalad logo | None | Agent 9. Give your agent a financial operating system. | Agent 9. Give your agent a financial operating system. | 4s |

## Voice and timing

ElevenLabs Jessica Gallagher (Irish female), `eleven_multilingual_v2`, speed 1; key only from ELEVENLABS_API_KEY. One audio file per scene including opening/closing. Measure audio with ffprobe. Product VO starts only after the new Stripe proof is visible, so the product-name timestamp always points to a readable id/status frame. Before/action can play without narration; no voice makes a premature claim. Opening/closing text is exact. Retiming affects action footage only; BEFORE and proof holds stay legible. Trim only silence at audio edges; do not slow speech.

For every product, persist capture BEFORE/action/proof timestamps, final timeline, verified test object type/status, and the actual product-name timestamp from transcription/forced alignment. Extract one final-video proof PNG for each product at that timestamp. Table uses prefix only (e.g. pi_, cs_test_, in_), not full ids. Full ids remain readable in the approved app panel and proof image; secrets never do.

## Pre-recording dependencies and acceptance

At PR #8 head 21d5452, the hosted UI has Stripe output panels, but chat does not route Checkout, Issuing, Connect, Billing or token commands. Toolkit may fall back to SDK. These are real capability gaps, not scenes to fake. Add honest chat routes and compact real Stripe proof views in the PR. A local real-Stripe test recording is possible after those changes; a live Modal recording needs the changed app deployed first. Deployment requires separate user authorization. Until that target is ready, scenes remain unrecorded.

- [x] Shotlist commit precedes the first recording.
- [x] All nine chat actions execute against real Stripe test mode; unsupported paths fail closed.
- [x] Each scene has fresh BEFORE/action/AFTER timestamps and separate source/rendered clips.
- [x] At each VO product-name timestamp, a real object's full id and relevant status are readable.
- [x] Toolkit proof records actual toolkit execution; no fallback substitution.
- [x] Official Stripe wordmark is unchanged; white/ink UI, HeySalad upper left, no pink background, captions or camera motion.
- [x] Jessica VO, exact opening and closing; final duration 50–60 seconds; last slate exactly 4 seconds.
- [x] Fixed 1920×1080 and content-centred 1080×1920 exports; all nine proof frames and prefix-only table saved and attached to a PR.
- [x] Build/type checks, tests and runtime assertions pass. No merge or deployment implied by the PR.

## Approved target update (before recording)

The user approved local recording with real Stripe test objects for eight scenes. They explicitly instructed that Issuing be recorded on the hosted app instead: click **£80 at Ocado**, then open its newest real decline in **Stripe output**. This scene therefore uses the hosted card button rather than a missing hosted chat command. No Issuing key is copied or used locally. `APP_URL` supplies that hosted origin privately. The capture stylesheet changes presentation to white/ink and limits visible history to the newest real row and authorization; it never changes Stripe data or inserts proof. The local workspace at `/agent9` is part of this PR, not a deployment claim.
