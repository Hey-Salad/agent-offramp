# Agent 9 verification

## Combined chat-first cut — 16 October 2026

The final `npm run demo -- --combine-only` run passed **332 checks** and exported both formats at **108.100 seconds**. The longer runtime follows the user's subsequent request to combine the overview with step-by-step original chat journeys. The original 59.133-second overview remains under the ignored `demo/out/overview/`.

- Four real requests were typed into the original hosted Chat in headed Chromium: restock, a six-guest booking, a £120 customer invoice draft, and the matched supplier invoice. Continuous recordings include the actual response-to-document navigation, split into eight clips from measured browser/sync-marker timestamps. No response or document was fabricated.
- Read-back from the hosted app's Stripe output API verifies the new PaymentIntent (`succeeded`), Payment Link (`active`), customer invoice (`draft`) and supplier invoice (`paid`) all have `livemode: false`. Held restock items remain held; the customer draft was not sent; the deposit checkout was not paid. No payment details were entered.
- Every original product proof frame is byte-identical to the preserved overview proof, in both formats. The first nine products and their voice timestamps are unchanged. Opening remains 6 seconds; the single final slate is exactly 4 seconds.
- 19 voice files correlate with final narration at **0.9765 or better**, with measured **zero offset**. Landscape and portrait audio match. Jessica Gallagher's Irish voice remains at natural speed 1. No captions, subtitle streams, music or camera motion.
- 1920×1080 and 1080×1920 exports. Fixed crops follow the content for each hard cut; the invoice detail panel cuts to its download controls when named. Portrait excludes the navigation. Native Stripe customer pages retain authentic branding; the original app uses white/ink capture CSS without modifying data.
- Extracted **110 two-second frames** plus **34 proof frames**, checked for login text and exposed app origins. Automated flat-area colour checks find no pink backgrounds. Visually inspected the new proof frames/contact sheets, checkout form and invoice downloads. A checkout loading-placeholder issue found in the first visual pass was fixed by waiting for the actual payment form, then re-recording that journey.
- `npm run lint`, syntax checks on the added JavaScript modules, and `npm run test:agent9` pass. Read-only hosted UI checks: **63/63**. The full Stripe test suite was not run because it includes local Issuing actions, which the user excluded.
- Capture plans were committed before recording (`a2d122b`, chat-first clarification `d67405e`). Credentials, raw clips, voice caches and final videos remain ignored. Updated timing JSON, proof table, new evidence frames and QA summaries are included in PR #10. No merge or deployment.

## Original overview validation (preserved separately)

The complete capture/edit command `npm run demo` produced both final videos at **59.133 seconds**. The final verification run passed **201 checks**.

- 1920×1080 landscape; 1080×1920 portrait. Headed Chromium source: 1920×1200, scale 1. Fixed content crop, no sidebar in portrait.
- All nine products recorded in order, with real BEFORE/action/AFTER timings in [beats.json](out/beats.json). The shotlist was committed first: 5ae466c; approved split documented in cde2b96.
- Eight scenes use the local app and real Stripe test objects. Issuing uses the user-approved hosted app button and its real Stripe output panel. No Issuing key or Issuing action runs locally in the pipeline.
- Fresh Stripe readbacks confirm test mode. The £80 authorization is closed with approved=false and a spending-controls decline. Connect includes an actual source-matched transfer and £3 application fee. Transfer settlement currency is shown separately from the GBP charge.
- Agent Toolkit's customer, invoice and item writes really use its tools, with no fallback accepted for this scene. Checkout also records its actual Toolkit/SDK execution path.
- Jessica Gallagher (Irish), eleven_multilingual_v2, natural speed 1. Character alignment sets product-name frame times; PCM correlation measures zero voice offset for every scene. Both formats have identical narration.
- Opening card: exactly 0–6s. HeySalad closing slate: exactly the final 4s. Opening and closing spoken text match the request.
- Individually reviewed all 18 product proof frames at full size and both two-second contact sheets, plus opening/closing frames. IDs and relevant statuses are readable in both formats; no captions, subtitles, zoom, pan, pink backgrounds, login pages or visible app URLs.
- Automated OCR checks all 60 two-second samples and all 18 proof frames for login/URL text; flat-area colour checks reject pink backgrounds. ffprobe checks streams, dimensions, duration and starts.
- The added workspace is disabled by default; the runner opts in with AGENT9_DEMO=1. New chat requests and real results are persisted in the existing audit store under recording rule D1. Type checks and fail-closed Agent 9 tests pass. Existing read-only UI regression tests: 63/63. The existing full test script was not run because it would trigger local Issuing, contrary to the user's instruction.
- Raw recordings, audio caches and final MP4s stay ignored. The PR includes all 18 proof PNGs, the prefix-only table, timing JSON, contact sheets and machine evidence. Environment values and credential files are excluded.

Official unmodified Stripe slate SVG c243d6a693df3a3678a8353d89199d0c7fdb5efc7d93983dea77166c5ba75f36-256: `c243d6a693df3a3678a8353d89199d0c7fdb5efc7d93983dea77166c5ba75f36`.

Rebuild instructions: [README](README.md). Proof timestamps and lines: [table](out/proof-table.md). No deployment or merge is part of this work.

PR: [#10](https://github.com/Hey-Salad/agent-offramp/pull/10), stacked on #8, open for review and unmerged.
