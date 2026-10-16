# Agent 9 verification

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
