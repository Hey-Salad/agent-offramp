# Verified Agent 9 demos

The original chat now offers nine fixed business examples, each ending in a real Stripe test result. The deployed test app is verified at ff8b87fe50c4e0df8c3261c0f99961f9901c74fe; later commits change recording/evidence/docs only. PR #10 remains unmerged on codex/agent9-demo, stacked on #8.

| Artifact | Dimensions | Runtime | Bytes |
| --- | --- | ---: | ---: |
| agent9-demo.mp4 | 1920×1080 | 59.133s | 1771196 |
| agent9-demo-vertical.mp4 | 1080×1920 | 59.133s | 2312140 |
| agent9-walkthrough.mp4 | 1920×1080 | 89.167s | 3222025 |
| agent9-walkthrough-vertical.mp4 | 1080×1920 | 89.167s | 4617901 |

The user explicitly requested the final videos and document in Git. All four MP4s and the actual downloaded invoice PDF are committed; README links them. Raw captures, voice caches, credentials and private deployment logs stay ignored. assets.json and documents/manifest.json record SHA256 hashes.

## Observed checks

- npm run lint: pass. No separate application build exists; hosted runtime executes the TS app.
- npm run test:agent9: unsupported/live-object refusal and workspace opt-in pass.
- npm run test:chat-card: card parsing, policy, real-object validation, no-key refusal, concurrency and browser failure state pass. No local Issuing call.
- npm run test:chat-examples: nine exact mappings, altered-amount refusal, chooser Send gate, all nine no-key HTTP requests, safe links and inline proof pass.
- All nine hosted chat requests match persisted Stripe readbacks and policy/audits; strict actual Toolkit and real Issuing decline verified. Three public Stripe pages load, and the chooser has nine options without executing on selection.
- 279/279 overview video checks pass: 59.133s, product/proof/voice order, PCM voice alignment, dimensions, one audio/no subtitles, readable complete ids/statuses, two-second frame scans and no app origins/login pages/keys/client secrets/full card numbers. OCR id visibility allows I/l/1 ambiguity and ≤5% transcription error; exact ids independently match persisted readbacks.
- 272/272 longer-walkthrough checks pass: 89.167s; actual receipt, unpaid Checkout, deposit payment page, paid invoice details and real PDF. Original nine chat proof frames remain pixel-identical; overview MP4 hashes remain unchanged. Final narration is measured against source PCM in both formats.
- Actual Download invoice event produces a valid PDF; Poppler render and extracted invoice letters/digits/amount match the visible hosted invoice. Stripe PDF font maps hyphens to NUL in text extraction, so separators are normalized. Invoice number and amount remain readable in both final PDF proof frames. Each separately recorded PDF view has its own verified download hash.
- Empty Stripe form hints (1234 repeated) are empty placeholders, not entered card data. No form is filled or submitted. Native Stripe/PDF pages keep their own styling; app scenes are white/ink. No caption/subtitle overlays, music, camera zoom or pan. PDF viewer opens at a fixed reading scale before proof.
- The existing 8s GIF and two social videos remain unchanged, with their earlier committed all-frame checks and light/dark README previews.

## Review evidence

[Product proof table](out/proof-table.md), [real beats](out/beats.json), [nine chat proof frames](out/proof/), [customer proof table](out/customer-proof-table.md), [customer timestamps](out/customer-beats.json), [customer proof frames](out/customer-proof/), [PDF hash](out/documents/manifest.json), [video hashes](out/assets.json). The two-second contact sheets and OCR/PCM reports are committed in out/qa and out/customer-qa.
